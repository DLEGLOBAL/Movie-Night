/* =========================================================================
   MOVIE NIGHT! — deploy config
   -------------------------------------------------------------------------
   The realtime "room server" is a WebSocket (server.js). The app needs to
   know where it lives.

   • All-in-one host (Render / Railway / Glitch / a VPS running `npm start`,
     or your local server): leave this EMPTY. The app connects to the same
     origin it was served from. ✅ nothing to do.

   • Static host (Netlify / GitHub Pages / Vercel static): those CANNOT run a
     WebSocket server, so you must host server.js somewhere that can (e.g.
     Render free tier) and put its public wss:// URL below:

         window.MOVIE_NIGHT_SIGNAL = "wss://your-server.onrender.com/ws";

   ========================================================================= */
window.MOVIE_NIGHT_SIGNAL = "";   // empty = same origin (use this on Render/Glitch/local)
