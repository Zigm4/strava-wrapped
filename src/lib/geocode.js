// Géocodage inverse via Nominatim (OpenStreetMap) - gratuit, sans clé.
// Une requête par spot affiché (le centre du cluster), mise en cache en mémoire.
// Aucune donnée stockée durablement.
//
// Confidentialité : on n'envoie que des coordonnées ARRONDIES à ~1 km (2 décimales).
// C'est amplement suffisant pour retrouver une ville, sans transmettre la position exacte
// du départ (souvent proche du domicile).

const cache = new Map()

export function reverseGeocode(lat, lng) {
  // arrondi à 2 décimales (~1,1 km) : sert à la fois de clé de cache ET de coord envoyée
  const rLat = lat.toFixed(2)
  const rLng = lng.toFixed(2)
  const key = `${rLat},${rLng}`
  if (cache.has(key)) return cache.get(key)

  const p = (async () => {
    try {
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
