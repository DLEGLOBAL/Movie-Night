/* =========================================================================
   MOVIE NIGHT!  —  room server
   - Serves the static app (index.html, etc.)
   - Relays room messages between everyone in a room (the sync bus)
   - Routes WebRTC signaling (offer / answer / ICE) point-to-point so the
     host can live-broadcast a file or screen straight to each guest.
   The media itself never touches this server — it goes peer-to-peer over
   WebRTC. This box only shuttles tiny JSON control messages.
   ========================================================================= */
const http = require("http");
const fs   = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 5577;
const ROOT = __dirname;
const MIME = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css",
  ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml",
  ".ico":"image/x-icon", ".mp4":"video/mp4", ".webm":"video/webm", ".md":"text/markdown",
};

/* ---------- static file server ---------- */
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
});

/* ---------- realtime room bus ---------- */
const wss   = new WebSocketServer({ server, path: "/ws" });
const rooms = new Map();   // roomCode -> Set<ws>
const peers = new Map();   // peerId   -> ws

const roomSet = (code) => rooms.get(code) || rooms.set(code, new Set()).get(code);

// the authoritative member list of a room (each socket's cached identity)
const rosterOf = (code) => {
  const set = rooms.get(code); const a = [];
  if (set) for (const p of set) if (p.who) a.push(p.who);
  return a;
};
const sendRosterTo = (ws) => { if (ws.readyState === 1) try { ws.send(JSON.stringify({ t: "roster", members: rosterOf(ws.room) })); } catch (e) {} };
const broadcastRoster = (code) => {
  const set = rooms.get(code); if (!set) return;
  const msg = JSON.stringify({ t: "roster", members: rosterOf(code) });
  for (const p of set) if (p.readyState === 1) try { p.send(msg); } catch (e) {}
};

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (data) => {
    const raw = data.toString();
    let m; try { m = JSON.parse(raw); } catch { return; }

    // learn who/where this socket is from the messages it sends
    if (m.room && ws.room !== m.room) { ws.room = m.room; roomSet(m.room).add(ws); }
    if (m.from) { ws.peerId = m.from; peers.set(m.from, ws); }
    if (m.who) ws.who = m.who;   // cache identity so we can hand newcomers a roster

    // point-to-point (WebRTC signaling, state sync replies): deliver only to `to`
    if (m.to) {
      const tgt = peers.get(m.to);
      if (tgt && tgt.readyState === 1 && tgt.room === ws.room) tgt.send(raw);
      return;
    }
    // otherwise fan out to everyone else in the room
    const set = rooms.get(ws.room);
    if (!set) return;
    for (const peer of set) if (peer !== ws && peer.readyState === 1) peer.send(raw);

    // server-authoritative roster: membership comes from who's actually CONNECTED,
    // not from client heartbeats (those throttle to a crawl in background tabs).
    if (m.t === "join") broadcastRoster(ws.room);   // everyone learns the newcomer; newcomer learns everyone
    else if (m.t === "hello") sendRosterTo(ws);     // a reconnecting/refocusing client refreshes its own list
  });

  ws.on("close", () => {
    if (!ws.room || !rooms.has(ws.room)) return;
    const set = rooms.get(ws.room);
    set.delete(ws);
    if (ws.peerId && peers.get(ws.peerId) === ws) peers.delete(ws.peerId);
    // tell the room this peer is gone (immediate) + push the authoritative roster
    const bye = JSON.stringify({ t: "leave", id: ws.peerId, room: ws.room });
    for (const peer of set) if (peer.readyState === 1) peer.send(bye);
    if (set.size === 0) rooms.delete(ws.room); else broadcastRoster(ws.room);
  });
});

/* drop dead sockets so presence stays accurate */
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 30000);

/* ---------- helpful startup banner with the LAN address to share ---------- */
function lanIPs() {
  const nets = require("os").networkInterfaces(); const out = [];
  for (const name of Object.keys(nets))
    for (const ni of nets[name] || [])
      if (ni.family === "IPv4" && !ni.internal) out.push(ni.address);
  return out;
}
server.listen(PORT, () => {
  console.log("\n  🎬  MOVIE NIGHT! is live\n");
  console.log("     On this computer:   http://localhost:" + PORT);
  for (const ip of lanIPs()) console.log("     On your network:    http://" + ip + ":" + PORT + "   <- share this with guests on the same Wi-Fi");
  console.log("\n     For friends on other networks, expose it with a tunnel, e.g.:");
  console.log("        npx localtunnel --port " + PORT + "      (or:  cloudflared tunnel --url http://localhost:" + PORT + ")\n");
});
