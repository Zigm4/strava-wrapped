// Géocodage inverse via Nominatim (OpenStreetMap) - gratuit, sans clé.
// Une requête par spot affiché (le centre du cluster), mise en cache en mémoire.
// Aucune donnée stockée durablement.

const cache = new Map()

export function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
  if (cache.has(key)) return cache.get(key)

  const p = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12&accept-language=fr`
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
