// Alternative à Netlify : Cloudflare Worker pour l'échange de token Strava.
// Déploie avec `wrangler deploy`. Secrets à définir :
//   wrangler secret put STRAVA_CLIENT_ID
//   wrangler secret put STRAVA_CLIENT_SECRET

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

    try {
      const { code } = await request.json()
      if (!code) return new Response('Missing code', { status: 400, headers: CORS })

      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.STRAVA_CLIENT_ID || env.VITE_STRAVA_CLIENT_ID,
          client_secret: env.STRAVA_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      })
      const data = await res.json()
      const json = { ...CORS, 'Content-Type': 'application/json' }
      // En cas d'erreur Strava, on relaie le message brut pour faciliter le diagnostic.
      if (!res.ok) return new Response(JSON.stringify(data), { status: res.status, headers: json })
      const payload = {
        access_token: data.access_token,
        expires_at: data.expires_at,
        athlete: data.athlete
          ? { firstname: data.athlete.firstname, username: data.athlete.username }
          : null,
      }
      return new Response(JSON.stringify(payload), { status: 200, headers: json })
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS })
    }
  },
}
