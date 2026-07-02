import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' -> chemins relatifs, fonctionne sous n'importe quel chemin de déploiement.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const clientId = env.STRAVA_CLIENT_ID || env.VITE_STRAVA_CLIENT_ID
  const clientSecret = env.STRAVA_CLIENT_SECRET

  return {
    base: './',
    plugins: [
      react(),
      // Endpoint d'échange de token Strava pour le DEV LOCAL uniquement.
      // (en prod : la fonction Netlify/Cloudflare fournie). Lit .env :
      //   VITE_STRAVA_CLIENT_ID=...   STRAVA_CLIENT_SECRET=...
      {
        name: 'strava-token-dev',
        configureServer(server) {
          server.middlewares.use('/api/strava-token', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed') }
            let body = ''
            req.on('data', (c) => (body += c))
            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json')
              try {
                if (!clientId || !clientSecret) {
                  res.statusCode = 500
                  return res.end(JSON.stringify({ error: 'Renseigne VITE_STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET dans .env puis relance npm run dev.' }))
                }
                const { code, refresh_token } = JSON.parse(body || '{}')
                const grant = refresh_token
                  ? { grant_type: 'refresh_token', refresh_token }
                  : { grant_type: 'authorization_code', code }
                const r = await fetch('https://www.strava.com/oauth/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...grant }),
                })
                const data = await r.json()
                res.statusCode = r.status
                res.end(JSON.stringify({
                  access_token: data.access_token,
                  refresh_token: data.refresh_token,
                  expires_at: data.expires_at,
                  athlete: data.athlete ? { firstname: data.athlete.firstname, username: data.athlete.username } : null,
                }))
              } catch (e) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: String(e) }))
              }
            })
          })
        },
      },
    ],
  }
})
