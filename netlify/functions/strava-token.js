// Mini-fonction Netlify : échange le code OAuth contre un token Strava.
// Le CLIENT_SECRET vit ici (variable d'env Netlify), jamais dans le front.
//
// Variables d'env à définir dans Netlify :
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method not allowed' }

  try {
    const { code } = JSON.parse(event.body || '{}')
    if (!code) return { statusCode: 400, headers: CORS, body: 'Missing code' }

    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const data = await res.json()
    // On ne renvoie que l'utile au front (token + profil minimal).
    const payload = {
      access_token: data.access_token,
      expires_at: data.expires_at,
      athlete: data.athlete
        ? { firstname: data.athlete.firstname, username: data.athlete.username }
        : null,
    }
    return { statusCode: res.status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(err) }) }
  }
}
