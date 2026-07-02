// Distance grand-cercle (haversine). Source unique, consommée par aggregate + polyline.

const R_M = 6371000 // rayon terrestre en mètres
const toRad = (d) => (d * Math.PI) / 180

export function haversineMeters(la1, lo1, la2, lo2) {
  const dLa = toRad(la2 - la1)
  const dLo = toRad(lo2 - lo1)
  const x =
    Math.sin(dLa / 2) ** 2 +
    Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2
  return 2 * R_M * Math.asin(Math.sqrt(x))
}

export const haversineKm = (la1, lo1, la2, lo2) => haversineMeters(la1, lo1, la2, lo2) / 1000
