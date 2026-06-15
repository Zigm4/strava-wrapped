// Décodage des polylignes encodées Strava (algorithme Google) + normalisation en path SVG.

export function decodePolyline(str, precision = 5) {
  if (!str) return []
  let index = 0, lat = 0, lng = 0
  const coordinates = []
  const factor = Math.pow(10, precision)
  while (index < str.length) {
    let result = 1, shift = 0, b
    do { b = str.charCodeAt(index++) - 63 - 1; result += b << shift; shift += 5 } while (b >= 0x1f)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    result = 1; shift = 0
    do { b = str.charCodeAt(index++) - 63 - 1; result += b << shift; shift += 5 } while (b >= 0x1f)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    coordinates.push([lat / factor, lng / factor])
  }
  return coordinates
}

// Normalise une liste de tracés ([[lat,lng],...]) vers un même cadre w×h.
// projette en mercator simple (lat -> y inversé) pour garder des formes naturelles.
export function normalizeRoutes(routes, w, h, pad = 8) {
  const valid = routes.filter((r) => r && r.length > 1)
  if (!valid.length) return []

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const proj = ([lat, lng]) => [lng, -lat] // y inversé pour l'écran
  for (const r of valid) for (const p of r) {
    const [x, y] = proj(p)
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const bw = maxX - minX || 1e-6
  const bh = maxY - minY || 1e-6
  // garde le ratio géographique
  const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh)
  const offX = (w - bw * scale) / 2
  const offY = (h - bh * scale) / 2

  return valid.map((r) =>
    r.map((p) => {
      const [x, y] = proj(p)
      return [offX + (x - minX) * scale, offY + (y - minY) * scale]
    }),
  )
}

export function pointsToPath(points) {
  if (!points || !points.length) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
}

function haversineM(la1, lo1, la2, lo2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180
  const dLa = toRad(la2 - la1), dLo = toRad(lo2 - lo1)
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

// Confidentialité : rogne les points contigus à moins de `r` mètres du départ ET de l'arrivée
// (≈ masquer le domicile, comme les "privacy zones" de Strava). Garde le milieu du tracé.
export function trimRoute(points, r = 300) {
  if (!points || points.length < 6) return points
  const start = points[0], end = points[points.length - 1]
  let i = 0, j = points.length - 1
  while (i < j && haversineM(points[i][0], points[i][1], start[0], start[1]) <= r) i++
  while (j > i && haversineM(points[j][0], points[j][1], end[0], end[1]) <= r) j--
  const seg = points.slice(i, j + 1)
  return seg.length >= 2 ? seg : points
}
