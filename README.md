# Strava Wrapped

Turn a month or a full year of your Strava activities into a beautiful, shareable image, ready to post as an Instagram story. Think "Spotify Wrapped", but for your runs, rides, hikes and more.

100% client-side. No backend, no database, nothing stored on a server. Try it instantly with the built-in demo, no account needed.

## What it does

- Pick a **month** or a **yearly recap**, and filter by activity type (run, ride, hike, walk, swim, ski, and more).
- Get a clean card with your **total distance**, distance **per type**, elevation gain, moving time, number of outings, active days and longest streak.
- Highlights in the spirit of a yearly wrap: **versus the previous period**, preferred time of day, share of weekend outings.
- Your **races** (Strava activities tagged as "Race") shown with distance, time and pace, plus a record flag when it is your best pace at that distance.
- Your **favourite spot** of the period, found by clustering your GPS start points, with the city, region and a small route map.
- Export to a high resolution **PNG** in Story (9:16), Post (4:5) or Square (1:1), with preset backgrounds or your own photo, accent colours and a light or dark theme.

## Privacy first

This project is built so that your data never leaves your device, except the calls your browser makes directly to Strava.

- **No server of ours ever sees your data.** Activities are fetched, aggregated and rendered entirely in your browser.
- **No database.** The only optional persistence is a local cache in your browser (IndexedDB) so a page refresh does not re-download everything. You can wipe it with one click ("Disconnect").
- **Your Strava token is never stored.** It lives in memory for the session only.
- **Privacy zone.** The route shown on the card can hide the start and end of your activity (about 300 m, like Strava privacy zones), so a shared image does not point to your home. It is on by default.
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

For production, deploy the provided token-exchange function (see `netlify/functions/strava-token.js` or `cloudflare-worker/`) and set `VITE_STRAVA_CLIENT_ID` and `VITE_TOKEN_EXCHANGE_URL` at build time. The Client Secret stays on the function side, never in the front end.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repository, go to Settings, then Pages, and set the source to GitHub Actions.
3. (Optional, for real Strava) In Settings, Secrets and variables, Actions, Variables, add `VITE_STRAVA_CLIENT_ID` and `VITE_TOKEN_EXCHANGE_URL`.

The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. The Vite `base` is set to `./`, so it works under any repository name. Without the Strava variables, the published site runs in demo mode only.

## Tech stack

Vite, React, Framer Motion, html-to-image and lucide-react. No backend, apart from the tiny stateless OAuth function. Favourite-spot geocoding uses OpenStreetMap Nominatim.

## License and attribution

Released under the MIT License (see [LICENSE](LICENSE)). You are free to fork, modify and reuse it, including commercially. In return, please keep a visible credit to the original project, "Strava Wrapped" by Jimmy Marchetto, with a link back to this repository.

This project is not affiliated with Strava. "Powered by Strava" per their brand guidelines.
