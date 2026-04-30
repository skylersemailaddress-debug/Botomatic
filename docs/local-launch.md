# Local Launch (Windows, Linux/Chromebook, Android)

## Windows
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`

## Linux / Chromebook
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000` (or `penguin.linux.test` bridge URL if your Chromebook networking requires it)

## Android phone (same LAN)
1. Ensure phone and computer are on the same Wi-Fi.
2. Run `npm run dev:lan`.
3. Open the printed Android phone URL (`http://<LAN_IP>:3000`).
4. If Windows firewall prompts, allow Node.js on private network.
5. `localhost` on Android means the phone, not your PC.
6. Optional: use Add to Home Screen from the mobile browser.

## Troubleshooting
- Port 3000 in use: free the UI port or stop the conflicting process.
- Port 3001 in use: free the API port or stop the conflicting process.
- API auth disabled: ensure launcher keeps `API_AUTH_TOKEN=dev-api-token`.
- 401 Unauthorized: ensure UI/API tokens match (`dev-api-token`).
- Failed to fetch: verify same Wi-Fi, firewall, and LAN URL.
- Windows PowerShell env syntax issue: use `npm run dev` instead of inline `PORT=...` syntax.
- Do not run `npm audit fix --force` for launch setup.
