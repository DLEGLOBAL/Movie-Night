# Deploying MOVIE NIGHT!

⚠️ **Read this first — it explains why "the person I invited didn't appear in the same room."**

MOVIE NIGHT! has two parts:

1. **The page** — `index.html` + `config.js` (static files).
2. **The room server** — `server.js`, a tiny **WebSocket** relay. This is what puts two
   people *in the same room*: it passes their messages and WebRTC signaling back and forth.

For two people to land in the same room, **both must reach the same running room server.**
That's the whole trick. A `http://localhost…` link or a `192.168…`/`10.…` LAN link only works
on your own computer / your own Wi-Fi — which is the usual reason a guest "doesn't appear."

---

## ❗ About Netlify

Netlify (and GitHub Pages, Vercel-static, etc.) **only serve static files — they cannot run the
WebSocket room server.** So **Netlify by itself will NOT make rooms work** — everyone would load
the page but never connect to each other. You have two real options:

### ✅ Option A (recommended) — host the whole thing on a Node platform (one URL, rooms just work)

Use a host that runs `npm start` (which runs `server.js`, and `server.js` serves the page too):
**Render**, **Railway**, **Glitch**, **Fly.io**, or any VPS.

Render example (free):
1. Push this folder to a GitHub repo.
2. Render → **New → Web Service** → pick the repo.
3. Build command: `npm install` · Start command: `npm start` (Render sets `PORT` automatically — `server.js` already reads it).
4. You get `https://your-app.onrender.com`. Share **that** URL. Everyone who opens it and enters
   the code is in the same room. Leave `config.js` empty (it uses the same origin).

Glitch is the no-Git option: glitch.com → New Project → **Import from GitHub**, or drag the files in.

### 🅱️ Option B — Netlify for the page + the room server hosted separately

1. Deploy `server.js` to Render/Glitch as in Option A → note its URL, e.g. `https://mn.onrender.com`.
2. Edit **`config.js`**:
   ```js
   window.MOVIE_NIGHT_SIGNAL = "wss://mn.onrender.com/ws";
   ```
3. Deploy the static files to Netlify (drag-and-drop the **`MovieNight.zip`** at app.netlify.com/drop,
   or connect the repo). The page loads from Netlify and connects to your room server over `wss://`.

> Why `wss://` and `/ws`: the server listens for WebSocket upgrades on the `/ws` path, and a page
> served over `https` must use the secure `wss://` scheme.

---

## The zip

`MovieNight.zip` contains everything except `node_modules` (the host runs `npm install`),
`cloudflared.exe`, and logs. It works for **either** option above:

- Netlify drag-drop → static page (then set `config.js` per Option B).
- Render/Glitch/Railway → full app incl. rooms (Option A).

## Just testing locally / on your Wi-Fi right now?

You already have `share-to-phone.cmd` — it starts the server **and** a public Cloudflare tunnel and
prints a `https://…trycloudflare.com` URL. Share **that** (not localhost) and everyone who opens it +
enters the code is in the same room. It's the quickest way to verify rooms work before you deploy.
(That URL is temporary and only lives while the window is open.)
