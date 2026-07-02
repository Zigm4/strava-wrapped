// Mini-fonction Netlify : échange OAuth Strava (code -> token, ou refresh_token -> token).
// Le CLIENT_SECRET vit ici (variable d'env Netlify), jamais dans le front.
//
// Variables d'env à définir dans Netlify :
//   STRAVA_CLIENT_SECRET  (obligatoire, secret)
//   STRAVA_CLIENT_ID      (ou, par défaut, VITE_STRAVA_CLIENT_ID déjà défini pour le front)
//   ALLOWED_ORIGIN        (optionnel : origine autorisée en CORS ; défaut = URL du site Netlify)

// En prod, le front appelle la fonction en MÊME ORIGINE (voir netlify.toml) : aucun CORS requis.
// On n'autorise donc en cross-origin QUE l'origine du site (jamais "*"), pour ne pas offrir
// un oracle d'échange de tokens ouvert à n'importe quel site.
const ALLOWED = process.env.ALLOWED_ORIGIN || process.env.URL || ''

function corsHeaders(origin) {
  const h = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
  if (ALLOWED && origin && origin === ALLOWED) h['Access-Control-Allow-Origin'] = ALLOWED
  return h
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || ''
  const CORS = corsHeaders(origin)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method not allowed' }

  try {
    const { code, refresh_token } = JSON.parse(event.body || '{}')
    if (!code && !refresh_token) return { statusCode: 400, headers: CORS, body: 'Missing code or refresh_token' }

    const grant = refresh_token
      ? { grant_type: 'refresh_token', refresh_token }
      : { grant_type: 'authorization_code', code }

    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        ...grant,
      }),
    })

    const data = await res.json()
    const json = { ...CORS, 'Content-Type': 'application/json' }
    if (!res.ok) {
      // Relaie le statut Strava mais un message générique (pas de fuite de détails serveur).
      return { statusCode: res.status, headers: json, body: JSON.stringify({ error: 'strava_oauth_failed', status: res.status }) }
    }
    // On ne renvoie que l'utile : tokens + profil minimal. (refresh_token nécessaire au refresh en session.)
    const payload = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete
        ? { firstname: data.athlete.firstname, username: data.athlete.username }
        : null,
    }
    return { statusCode: 200, headers: json, body: JSON.stringify(payload) }
  } catch {
    return { statusCode: 500, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_error' }) }
  }
}
