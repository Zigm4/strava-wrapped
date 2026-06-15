// Mini-fonction Netlify : échange le code OAuth contre un token Strava.
// Le CLIENT_SECRET vit ici (variable d'env Netlify), jamais dans le front.
//
// Variables d'env à définir dans Netlify :
//   STRAVA_CLIENT_SECRET  (obligatoire, secret)
//   STRAVA_CLIENT_ID      (ou, par defaut, VITE_STRAVA_CLIENT_ID deja defini pour le front)

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
        client_id: process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const data = await res.json()
    const json = { ...CORS, 'Content-Type': 'application/json' }
    // En cas d'erreur Strava (ex. client_id/secret manquant, code expire), on relaie le message brut.
    if (!res.ok) {
      return { statusCode: res.status, headers: json, body: JSON.stringify(data) }
    }
    // Sinon on ne renvoie que l'utile au front (token + profil minimal).
    const payload = {
      access_token: data.access_token,
      expires_at: data.expires_at,
      athlete: data.athlete
        ? { firstname: data.athlete.firstname, username: data.athlete.username }
        : null,
    }
    return { statusCode: 200, headers: json, body: JSON.stringify(payload) }
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(err) }) }
  }
}
