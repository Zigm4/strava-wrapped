# Rewind

Turn a month or a full year of your Strava activities into a beautiful, shareable image, ready to post as an Instagram story. A recap for your runs, rides, hikes and more.

100% client-side. No backend, no database, nothing stored on a server. Try it instantly with the built-in demo, no account needed.

## What it does

- Pick a **month** or a **yearly recap**, and filter by activity type (run, ride, hike, walk, swim, ski, and more).
- Get a clean card with your **total distance**, distance **per type**, elevation gain, moving time, number of outings, active days and longest streak.
- Highlights in the spirit of a yearly wrap: **versus the previous period**, preferred time of day, share of weekend outings.
- Your **races** (Strava activities tagged as "Race") shown with distance, time and pace, plus a record flag when it is your best pace at that distance.
- Your **favourite spot** of the period, found by clustering your GPS start points, with the city, region and a small route map.
- Export to a high resolution **PNG** in Story (9:16), Post (4:5) or Square (1:1), with preset backgrounds or your own photo, accent colours and a light or dark theme.

## Privacy first

This project is built so that your data stays on your device. The only network calls it makes are: directly to Strava (your activities), and one reverse-geocoding lookup to name your favourite spot (see below).

- **No server of ours ever sees your data.** Activities are fetched, aggregated and rendered entirely in your browser.
- **No database.** The only optional persistence is a local cache in your browser (IndexedDB) so a page refresh does not re-download everything. You can wipe it with one click ("Disconnect").
- **Your Strava tokens are never stored.** The access token (and refresh token, used to renew it during a session) live in memory only, and are gone when you close the tab.
- **Privacy zone.** The route shown on the card can hide the start and end of your activity (about 300 m, like Strava privacy zones), so a shared image does not point to your home. It is on by default. If the whole route stays inside that zone, no map is shown at all.
- **One third-party lookup: the favourite spot.** To label your favourite spot with a real city name, the app sends its (coarsened, ~1 km) coordinates to OpenStreetMap's Nominatim service. This only happens for real data, never in demo mode, and nothing is stored there.
- **Fonts are self-hosted**, so no request goes to Google Fonts and no visitor IP is exposed to a font CDN.
- The small serverless function used for login (see below) is **stateless**: it only relays the OAuth token exchange and stores nothing.

## How it works

1. **Login.** Strava OAuth requires a client secret to exchange the auth code for a token, which cannot live safely in a static page. So the front end stays static and a tiny serverless function (about 20 lines, free tier) performs only the token exchange. The demo needs none of this.
2. **Fetch.** With the token, your browser pulls your activities directly from the Strava API (paginated, last 5 years).
3. **Aggregate.** All the stats, the favourite spot clustering, records and highlights are computed in the browser.
4. **Render and export.** The card is plain HTML and CSS, exported to PNG with `html-to-image`. Nothing is uploaded anywhere.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL and click **"Voir une démo"** to explore with realistic sample data. No keys required.

### Connect your real Strava (optional)

You only need to do this once, as the owner of the app. Your users never create anything: they just click "Connect with Strava" and log in.

1. Create one API application at https://www.strava.com/settings/api. Set the Authorization Callback Domain to your domain (for local dev, use `localhost`). Note your Client ID and Client Secret.
2. Create a `.env` file at the project root:
   ```
   VITE_STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   ```
3. Run `npm run dev`. The dev server exposes a local token-exchange endpoint, so the "Connect with Strava" button works immediately.

For production, deploy the provided token-exchange function (`netlify/functions/strava-token.js`) and set `VITE_STRAVA_CLIENT_ID` at build time (`VITE_TOKEN_EXCHANGE_URL` is already wired by `netlify.toml`). The Client Secret stays on the function side, never in the front end.

## Deploy, and how login works once published

A static page cannot safely hold the Strava client secret, and Strava does not support PKCE. So the secret never lives in the front end: a tiny serverless function holds it and performs only the token exchange. As a result:

- The published static site works on its own in **demo mode**, with no secret.
- The real "Connect with Strava" button needs that function deployed, and the front end needs its URL (`VITE_TOKEN_EXCHANGE_URL`).

### Deploy on Netlify (front end and function together)

Netlify hosts the static site and the token-exchange function in one place, so there is no CORS and a single deploy. The settings come from `netlify.toml`.

1. On Netlify, "Add new site", import this GitHub repository.
2. In Site settings, Environment variables, add:
   - `VITE_STRAVA_CLIENT_ID` set to your Strava Client ID
   - `STRAVA_CLIENT_SECRET` set to your Strava Client Secret
   (`VITE_TOKEN_EXCHANGE_URL` is already wired to the function path in `netlify.toml`.)
3. Deploy, then set the Strava app Authorization Callback Domain to your Netlify domain.

The secret stays on Netlify, never in the repository or the front end. After changing environment variables, trigger a new deploy so the values are baked into the build.

The app is just a static site plus one stateless function, so it also runs on Vercel or any static host paired with a small serverless token-exchange endpoint. The Vite `base` is `./`, so it works under any path.

## Tech stack

Vite, React, Framer Motion, html-to-image and lucide-react. Self-hosted fonts (Space Grotesk, Inter). Tested with Vitest. No backend, apart from the tiny stateless OAuth function. Favourite-spot geocoding uses OpenStreetMap Nominatim.

## License and attribution

Released under the MIT License (see [LICENSE](LICENSE)). You are free to fork, modify and reuse it, including commercially. In return, please keep a visible credit to the original project, "Rewind" by Jimmy Marchetto, with a link back to this repository.

This project is not affiliated with Strava. "Powered by Strava" per their brand guidelines.
