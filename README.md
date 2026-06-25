# 🎬 MOVIE NIGHT!

A synced watch-party + food-timing web app, now with a real room server and **host
live-broadcast** — the room owner can play a video file or share their screen/tab and every
guest watches it **in real time**.

Built from the *actual product* buried in `MOVIE_NIGHT_Enterprise_Deep_Dive_Master_Blueprint.pdf`.

> **About that PDF:** it's 241 pages, but only ~1 page of unique content repeated 120× with an
> incrementing "Layer N" (288 unique lines out of 5,643 — all section headers). The substance is a
> block of enterprise buzzwords (Kubernetes, Kafka, Redis, SOC2, "BASE44") with no concrete specs.
> This app is the real thing those buzzwords are gesturing at.

## Run it

```
npm install      # one time
npm start
```

Then open **http://localhost:5577**. The server prints a `http://<your-ip>:5577` address too —
that's the one to share with guests on the same Wi-Fi.

> No-server mode: you can still just open `index.html` directly (file://). It falls back to
> `BroadcastChannel`, which syncs windows in the *same browser* — handy for a quick solo demo.

> First visit shows a quick **guided tour**; reopen it anytime with the **❓** button (top bar) or the lobby link.

## Watch together

1. **Create a Movie Night** → you get a room code (badge shows **● Live server**). The **host** controls the film & food; everyone else watches and hangs out.
2. Invite people with the **📣 Invite** button — copy the link, native share, or send straight to a friend's **email or phone** (the join code is built into the link). Guests open it and **Join**.
3. As host, put something on the screen from the **Room** tab:
   - **🎬 Browse free films** — a picker of real, recognizable **public-domain classics** (Night of the Living Dead, Nosferatu, Charade, His Girl Friday…) that legally stream to the whole room, in sync, with poster thumbnails.
   - **🖥️ Share screen / tab** — broadcast a tab (tick *"Share tab audio"*) to play a current movie from your own streaming service (Netflix, etc.).
   - **🎬 Play a video file** — your local movie streams to every guest over WebRTC, live.
   - **🔗 Paste a URL** — everyone loads the same video on the synced clock.
   Play / pause / seek / showtime stay in sync — and **only the host** drives them.
4. **Turn your camera on** (Room tab → *Start camera & mic*) to see & hear everyone. Toggle cam/mic, pick a live **effect** (Noir, Party, …). Cameras are a full WebRTC mesh — separate from the host's movie.

> **About the films:** they're genuinely public-domain titles that stream from the Internet Archive — real and legal. For copyrighted new releases, the host's **Share screen** is the legitimate way to watch together (everyone sees the host's own licensed stream). The app deliberately does **not** integrate piracy embeds.

### Friends on other networks

WebRTC media is peer-to-peer, so put the app on the public internet with a quick tunnel:

```
npx localtunnel --port 5577
# or
cloudflared tunnel --url http://localhost:5577
```

Share the tunnel URL. (Most home networks connect via STUN out of the box; very strict/corporate
NATs would additionally need a TURN server — add its `{urls,username,credential}` to `RTC_CFG`
in `index.html`.)

## 📱 Open it on your phone

**Easiest path (works on *any* network, including cellular):** double-click **`share-to-phone.cmd`**.
It starts the server, opens a secure Cloudflare tunnel, and prints a public
`https://<random-words>.trycloudflare.com` link (also saved to `phone-url.txt`). Open that link on the
phone — or in the app hit **"copy invite link"** and text it to friends; the join code is prefilled
straight from the link.

Prefer to run it by hand? `cloudflared.exe` is already in this folder:

```
npm start
# in a second terminal, from this folder:
.\cloudflared.exe tunnel --url http://localhost:5577
```

Two things to know either way: the tunnel URL is random and **changes every run**, and it only works
**while the launcher (or `cloudflared`) window stays open**.

**Why the plain `http://<your-ip>:5577` LAN address often *won't* open on a phone:** the PC is
usually wired into a *different* subnet than the phone's Wi-Fi, or the router has client/AP isolation
turned on. Turning the Windows firewall off doesn't help if the phone simply can't *route* to the PC.
To use the LAN address instead, the phone must be on the **same network/subnet** as the PC **and** the
router must allow client-to-client traffic — check that the phone's Wi-Fi IP is in the same range as
the PC's.

**Phone as host?** Yes — because the tunnel is **HTTPS** (a secure context), a phone can be the host
and use screen-share / camera there. Those browser APIs require `https` or `localhost`, which the
tunnel provides.

**Cross-network live-broadcast caveat:** WebRTC media is peer-to-peer. On the same LAN it connects
directly; across *different* networks (e.g. phone on cellular, PC behind NAT) the STUN-only config may
fail to link the media. To make that work, add a **TURN server** to `RTC_CFG` in `index.html`, e.g. an
entry like `{ urls:'turn:HOST:3478', username:'...', credential:'...' }`. Page-load, room sync, chat,
and watching catalog movies all work over the tunnel regardless.

## What it does

| Feature | What happens |
|---|---|
| 🎞️ **Synced player** | Shared playback clock — play / pause / seek / showtime propagate to everyone, with drift correction. Catalog of **real public-domain films** that stream from the Internet Archive, with poster thumbnails. |
| 📹 **Face cams** | Full WebRTC **mesh** — every viewer publishes cam+mic to every other viewer. Per-tile camera/mic toggles, live camera **effects** (Noir, Sepia, Party…), self-view mirrored. Separate from the movie. |
| 🔒 **Host controls** | Only the **host** drives the film (browse / screen-share / file / URL / playback) and the food. Guests' controls are disabled; everyone keeps their own camera, mic & chat. |
| 📣 **Invite** | Share the room link via copy, native share sheet, or straight to a friend's **email / phone** (`mailto:` / `sms:`). Join code is baked into the link. |
| ❓ **Guided tour** | A 7-step walkthrough on first visit (remembered in `localStorage`), reopenable anytime via the ❓ button. |
| 📡 **Host live-broadcast** | Host streams a **file** or **screen/tab** to all guests over WebRTC in real time. Guests see a LIVE badge and the host's feed. |
| 📺 **Bulletproof screen** | If a stream is blocked/offline, a **canvas "feature reel"** driven by the same clock takes over, so everyone still sees the identical frame. |
| ⏰ **Showtime** | Schedule a synchronized start; the movie auto-launches for the whole room at T-0 (exactly once). |
| 🍕 **Delivery timing engine** | Computes "order by 6:32 PM so food lands 5 min before showtime" from the restaurant ETA, and warns ⚠ when it can't make it. (Host-controlled.) |
| 💬 **Crew** | Live presence (host badge), chat, floating emoji reactions. |

## Architecture

```
 Browser (host)                server.js (Node + ws)              Browser (guest)
 ─────────────                 ─────────────────────              ───────────────
  app state  ──"state"──▶   relays JSON to the room  ──"state"──▶   app state
  WebRTC offer ─"rtc-offer"▶ routes point-to-point   ─"rtc-offer"▶  WebRTC answer
       └──────────────  media flows peer-to-peer (never via server)  ──────────┘
```

- **`server.js`** (~110 lines): serves the static app, fans room messages out to everyone, and
  routes `to`-addressed messages (WebRTC `offer`/`answer`/`ice`, state-sync replies) point-to-point.
  Media never touches it — only tiny JSON control messages do.
- **Transport** (`makeTransport` in `index.html`): WebSocket when served over http(s); falls back to
  `BroadcastChannel` for `file://`. Every message is auto-stamped `{room, from}` for routing. The
  app code never knows which transport is underneath.

### How the "blueprint" maps to reality

- *"Frame-accurate sync heartbeat" / "real-time playback reconciliation"* → the shared
  `{playing, position, at}` clock + 4×/sec drift correction.
- *"Multi-device state resolution" / "Kafka event streaming"* → the WebSocket relay (`server.js`).
- *"Adaptive bitrate HLS/DASH streaming"* → WebRTC host broadcast (`hostCall` / `onRtcOffer`).
- *"Predictive delivery timing engine" / "event-triggered playback alignment"* → the order-by /
  arrival math (`timingInfo`).
- Everything listed as Kubernetes/microservices/SOC2 is not required to ship this product.

---
*Movies are CC-licensed open films (Blender Foundation & Google sample media). Vanilla JS frontend,
one small Node dependency (`ws`) for the server.*
