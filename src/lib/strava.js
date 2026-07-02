// Client Strava - 100% côté navigateur, aucun stockage.
// Le token vit uniquement en mémoire (state React) le temps de la session.

import { decodePolyline } from './polyline.js'

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID
// En dev, un endpoint local d'échange de token est servi par Vite (voir vite.config.js),
// donc il suffit de renseigner le Client ID + le secret dans .env pour que ça marche.
const TOKEN_URL = import.meta.env.VITE_TOKEN_EXCHANGE_URL || (import.meta.env.DEV ? '/api/strava-token' : '')
const SCOPE = 'read,activity:read_all'

export const stravaClientId = CLIENT_ID
export const stravaConfigured = Boolean(CLIENT_ID && TOKEN_URL)

// redirect_uri propre, sans query ni hash (doit matcher le domaine déclaré sur Strava)
export function redirectUri() {
  return window.location.origin + window.location.pathname
}

const STATE_KEY = 'strava_oauth_state'

function newState() {
  try { return crypto.randomUUID() } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

export function authorizeUrl() {
  // `state` anti-CSRF : nonce stocké côté client, vérifié au retour (cf. readCallback).
  const state = newState()
  try { sessionStorage.setItem(STATE_KEY, state) } catch { /* mode privé : on dégrade proprement */ }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

// Lit ?code= / ?error= au retour de Strava, vérifie le `state`, puis nettoie l'URL.
// `stateOk` = false si le nonce ne correspond pas (callback potentiellement forgé).
export function readCallback() {
  const p = new URLSearchParams(window.location.search)
  const code = p.get('code')
  const error = p.get('error')
  const returnedState = p.get('state')
  if (code || error) {
    window.history.replaceState({}, '', redirectUri())
  }
  let stateOk = true
  if (code) {
    let saved = null
    try { saved = sessionStorage.getItem(STATE_KEY); sessionStorage.removeItem(STATE_KEY) } catch { /* noop */ }
    // Si sessionStorage est indisponible (saved === null sans écriture possible), on n'échoue pas
    // le flux pour ne pas casser les navigateurs en mode strict ; sinon on exige la correspondance.
    stateOk = saved == null ? true : saved === returnedState
  }
  return { code, error, stateOk }
}

// Échange le code contre un token via la fonction serverless (qui détient le secret).
export async function exchangeToken(code) {
  if (!TOKEN_URL) throw new Error('VITE_TOKEN_EXCHANGE_URL non configuré')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Échange du token échoué (${res.status}). ${txt}`)
  }
  return res.json() // { access_token, refresh_token, expires_at, athlete }
}

// Rafraîchit un access_token expiré à partir du refresh_token (grant refresh_token),
// via la même fonction serverless. Le refresh_token vit uniquement en mémoire de session.
export async function refreshAccessToken(refresh_token) {
  if (!TOKEN_URL) throw new Error('VITE_TOKEN_EXCHANGE_URL non configuré')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Rafraîchissement du token échoué (${res.status}). ${txt}`)
  }
  return res.json() // { access_token, refresh_token, expires_at }
}

// Récupère TOUTES les activités d'une plage [after, before] (epoch s) en paginant (200/req).
// Bien plus efficace que mois-par-mois : ~1 requête par tranche de 200 activités.
export async function fetchRange(accessToken, after, before, onProgress) {
  const all = []
  let page = 1
  while (page <= 80) {
    const params = new URLSearchParams({
      after: String(after),
      before: String(before),
      per_page: '200',
      page: String(page),
    })
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (res.status === 401) throw new Error('Session Strava expirée, reconnecte-toi.')
    if (res.status === 429) throw new Error('Limite de requêtes Strava atteinte, réessaie dans 15 min.')
    if (!res.ok) throw new Error(`Erreur Strava (${res.status})`)
    const batch = await res.json()
    all.push(...batch)
    onProgress?.(all.length)
    if (batch.length < 200) break
    page++
  }
  return all.map(normalize)
}

function normalize(a) {
  return {
    id: a.id,
    name: a.name,
    type: a.sport_type || a.type,
    workout_type: a.workout_type ?? null,
    distance: a.distance || 0,
    moving_time: a.moving_time || 0,
    elapsed_time: a.elapsed_time || 0,
    total_elevation_gain: a.total_elevation_gain || 0,
    total_elevation_loss: 0, // non fourni par l'API résumée
    start_date_local: a.start_date_local || a.start_date,
    average_speed: a.average_speed || 0,
    max_speed: a.max_speed || 0,
    location_city: a.location_city || null,
    location_state: a.location_state || null,
    location_country: a.location_country || null,
    start_latlng: a.start_latlng && a.start_latlng.length ? a.start_latlng : null,
    routePoints: a.map?.summary_polyline ? decodePolyline(a.map.summary_polyline) : null,
    achievement_count: a.achievement_count || 0,
    pr_count: a.pr_count || 0,
    kudos_count: a.kudos_count || 0,
    calories: 0, // non fourni par l'API résumée
  }
}
