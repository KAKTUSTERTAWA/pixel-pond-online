# Pixel Pond Online

A small, playable top-down fishing multiplayer starter. One Node.js process serves the game and Socket.IO WebSocket server. Rooms support up to 30 concurrent players each.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in two browser tabs/devices. Enter the same room name to meet in the same pond.

## Deploy free on Render

1. Create a GitHub repository and upload the contents of this folder (not the ZIP file itself).
2. Sign in at https://render.com and connect GitHub.
3. Choose **New → Web Service**, then select the repository.
4. Set **Build Command** to `npm install`, **Start Command** to `npm start`, and choose the **Free** instance.
5. Deploy. Render assigns an address like `https://pixel-pond-online.onrender.com`.
6. Share the URL. Friends must enter the same room name (default `pond-1`).

The included `render.yaml` can also be used as a Blueprint configuration.

## Included features

- Shared rooms, capped at 30 players per room
- Real-time player position synchronization via Socket.IO
- Keyboard controls (WASD / arrow keys) and mobile directional controls
- Fishing cooldown and server-generated fish catches/rewards
- Shared chat and online player list
- Health endpoint at `/health`
- Uploaded `.rttex`, `.rtfont`, and currency files retained in `public/assets/`

## Important prototype limits

This is a working multiplayer starter, not a production MMO. Coins, fish counts, and levels currently live in server memory and reset when the server restarts. Add a persistent database and account/authentication system before treating player progress as permanent. The uploaded proprietary texture/font files are included but not decoded or rendered by this browser prototype; the current scene uses drawn canvas art. Free Render services sleep after 15 minutes without inbound traffic and can take about a minute to wake. Free instances may restart and do not provide persistent local disk.
