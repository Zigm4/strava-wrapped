// Dates Strava — SANS jamais repasser par le fuseau horaire du navigateur.
//
// Piège : Strava renvoie `start_date_local` comme l'heure LOCALE de l'athlète,
// mais sérialisée avec un "Z" final trompeur (ex. une sortie du 31 juillet à 23h30
// locale arrive comme "2026-07-31T23:30:00Z"). Faire `new Date(s)` puis lire
// `.getMonth()`/`.getHours()` ré-applique le décalage du navigateur → l'activité
// bascule de jour, de mois, voire d'année. On lit donc les champs calendaires
// directement dans la chaîne, ce qui est stable quel que soit le fuseau.

function parts(iso) {
  const s = String(iso)
  return {
    year: +s.slice(0, 4),
    month: +s.slice(5, 7) - 1, // 0-based, comme Date.getMonth()
    day: +s.slice(8, 10),
    hour: +s.slice(11, 13) || 0,
    minute: +s.slice(14, 16) || 0,
  }
}

export const localParts = parts
export const localYear = (iso) => +String(iso).slice(0, 4)
export const localMonth = (iso) => +String(iso).slice(5, 7) - 1 // 0-based
export const localHour = (iso) => parts(iso).hour
export const localDayKey = (iso) => String(iso).slice(0, 10) // "YYYY-MM-DD"

// Jour de la semaine (0 = dimanche), calculé via UTC pour rester hors fuseau.
export function localWeekday(iso) {
  const { year, month, day } = parts(iso)
  return new Date(Date.UTC(year, month, day)).getUTCDay()
}

// Numéro de jour ordinal (pour les séries/streaks), hors fuseau.
export function localDayNumber(iso) {
  const { year, month, day } = parts(iso)
  return Math.floor(Date.UTC(year, month, day) / 86400000)
}

// Instant de l'heure murale locale en ms (pour comparer "le plus récent").
export function localTime(iso) {
  const { year, month, day, hour, minute } = parts(iso)
  return Date.UTC(year, month, day, hour, minute)
}

// Formate un Date local en chaîne "façon Strava" (heure murale + "Z"),
// pour que les données de démo suivent la même convention que l'API réelle.
export function toStravaLocal(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}Z`
}
