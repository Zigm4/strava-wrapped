// Helpers de formatage (français : virgule décimale, espace pour les milliers)

const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const fmtInt = (n) => nf0.format(Math.round(n || 0))

// distance en mètres -> km
export function fmtKm(meters, { decimals = 1 } = {}) {
  const km = (meters || 0) / 1000
  if (decimals === 0) return nf0.format(Math.round(km))
  return nf1.format(km)
}

// dénivelé en mètres
export function fmtElev(meters) {
  return nf0.format(Math.round(meters || 0))
}

// durée en secondes -> "12h34" / "47 min"
export function fmtDuration(seconds) {
  const s = Math.round(seconds || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m} min`
}

// durée compacte "12 h" pour les gros totaux
export function fmtHours(seconds) {
  const h = (seconds || 0) / 3600
  if (h >= 10) return `${nf0.format(Math.round(h))}`
  return nf1.format(h)
}

// allure (m/s -> min/km) pour course/marche
export function fmtPace(speedMs) {
  if (!speedMs || speedMs <= 0) return '-'
  const secPerKm = 1000 / speedMs
  let m = Math.floor(secPerKm / 60)
  let s = Math.round(secPerKm % 60)
  if (s === 60) { m += 1; s = 0 } // évite "3:60" dû aux arrondis
  return `${m}:${String(s).padStart(2, '0')}`
}

// vitesse (m/s -> km/h) pour vélo
export function fmtSpeed(speedMs) {
  if (!speedMs || speedMs <= 0) return '-'
  return nf1.format(speedMs * 3.6)
}

const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const MOIS_COURT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']

export const monthName = (m) => MOIS[m]
export const monthShort = (m) => MOIS_COURT[m]

export function monthLabel(year, month) {
  return `${MOIS[month]} ${year}`
}

export function dayLabel(date) {
  const d = new Date(date)
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]}`
}

// "à l'instant" / "il y a 2 h" / "il y a 3 j" à partir d'un timestamp (ms)
export function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  return `il y a ${j} j`
}
