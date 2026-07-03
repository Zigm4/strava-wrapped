// Géocodage inverse via Nominatim (OpenStreetMap) - gratuit, sans clé.
// Une requête par spot affiché (le centre du cluster), mise en cache en mémoire.
// Aucune donnée stockée durablement.
//
// Confidentialité : on n'envoie que des coordonnées ARRONDIES à ~1 km (2 décimales).
// C'est amplement suffisant pour retrouver une ville, sans transmettre la position exacte
// du départ (souvent proche du domicile).

const cache = new Map()

// File d'attente : Nominatim demande <=1 req/s. On sérialise les requêtes RÉSEAU en les
// espaçant de ~1,1 s. Les coordonnées déjà en cache répondent instantanément (hors file).
const MIN_GAP_MS = 1100
let gate = Promise.resolve()
let lastAt = -Infinity
function nextSlot() {
  const mine = gate.then(async () => {
    const wait = MIN_GAP_MS - (performance.now() - lastAt)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastAt = performance.now()
  })
  gate = mine.catch(() => {}) // garde la chaîne vivante même en cas d'échec
  return mine
}

export function reverseGeocode(lat, lng) {
  // arrondi à 2 décimales (~1,1 km) : sert à la fois de clé de cache ET de coord envoyée
  const rLat = lat.toFixed(2)
  const rLng = lng.toFixed(2)
  const key = `${rLat},${rLng}`
  if (cache.has(key)) return cache.get(key)

  const p = (async () => {
    try {
      await nextSlot()
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${rLat}&lon=${rLng}&zoom=12&accept-language=fr`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const data = await res.json()
      const a = data.address || {}
      return {
        city: a.city || a.town || a.village || a.municipality || a.county || a.suburb || null,
        region: a.state || a.region || a.state_district || null,
        country: a.country || null,
      }
    } catch {
      return null
    }
  })()

  cache.set(key, p)
  return p
}
