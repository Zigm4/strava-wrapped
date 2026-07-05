// Sélecteurs PURS de période et de comparaison (aucun React, aucun I/O).
// Extraits de Studio pour être testables et réutilisables.

import { localYear, localMonth, localParts, localTime } from './date.js'
import { familyKey, FAMILIES } from './activityTypes.js'
import { monthShort, monthLabel } from './format.js'

export function makeMonth(year, m, count = 0) {
  return { key: `${year}-${m}`, year, month: m, short: monthShort(m), label: monthLabel(year, m), count }
}

// `outOfRange` : mois antérieur au début de l'historique téléchargé (donnée non récupérée,
// à distinguer d'un mois réellement sans activité).
function makeMonthEx(year, m, count, floor) {
  const out = makeMonth(year, m, count)
  out.outOfRange = !!floor && (year < floor.year || (year === floor.year && m < floor.month))
  return out
}

// Les 12 mois d'une année donnée, avec le nb d'activités.
export function buildMonthsForYear(activities, year, floor) {
  const counts = {}
  for (const a of activities) {
    if (localYear(a.start_date_local) === year) {
      const m = localMonth(a.start_date_local)
      counts[m] = (counts[m] || 0) + 1
    }
  }
  return Array.from({ length: 12 }, (_, m) => makeMonthEx(year, m, counts[m] || 0, floor))
}

// Mois de l'activité la plus récente (pour la sélection par défaut).
export function mostRecentMonth(activities) {
  if (!activities.length) { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } }
  let best = null, bestT = -Infinity
  for (const a of activities) { const x = localTime(a.start_date_local); if (x > bestT) { bestT = x; best = a } }
  const p = localParts(best.start_date_local)
  return { year: p.year, month: p.month }
}

export function buildYears(activities) {
  const counts = {}
  for (const a of activities) {
    const y = localYear(a.start_date_local)
    counts[y] = (counts[y] || 0) + 1
  }
  let years = Object.keys(counts).map(Number).sort((a, b) => b - a).map((y) => ({ year: y, count: counts[y] }))
  if (!years.length) years = [{ year: new Date().getFullYear(), count: 0 }]
  return years
}

// Activités de la période sélectionnée (mois ou année).
export function periodActivitiesOf(activities, period, year, month) {
  if (period === 'year') return activities.filter((a) => localYear(a.start_date_local) === year)
  return activities.filter((a) => localYear(a.start_date_local) === month.year && localMonth(a.start_date_local) === month.month)
}

// Période de référence pour la comparaison, selon le mode :
//   'prev' -> mois (ou année) précédent ; 'yoy' -> même mois l'an dernier (année N-1 si bilan annuel).
// `partial` = comparaison trompeuse : période courante incomplète, ou référence hors de l'historique.
export function referencePeriod({ activities, period, year, month, dataFloor }, mode) {
  const now = new Date()
  const currentIncomplete =
    (period === 'month' && month.year === now.getFullYear() && month.month === now.getMonth()) ||
    (period === 'year' && year === now.getFullYear())

  let refYear, refMonth, label
  if (period === 'year') {
    refYear = year - 1; refMonth = null; label = String(year - 1)
  } else if (mode === 'yoy') {
    refYear = month.year - 1; refMonth = month.month; label = `${monthShort(month.month)} ${month.year - 1}`
  } else {
    const pm = new Date(month.year, month.month - 1, 1)
    refYear = pm.getFullYear(); refMonth = pm.getMonth(); label = monthShort(refMonth)
  }

  const prevActs = activities.filter((a) => {
    if (localYear(a.start_date_local) !== refYear) return false
    return refMonth == null || localMonth(a.start_date_local) === refMonth
  })

  const refM = refMonth == null ? 0 : refMonth
  const beforeFloor = !!dataFloor &&
    (refYear < dataFloor.year || (refYear === dataFloor.year && refM < dataFloor.month))

  // Période courante en cours + référence disponible -> comparaison « à date » : on tronque
  // la référence au même avancement (même quantième du mois, ou même mois+jour pour l'année),
  // pour un % honnête. On garde `prevActs` complet à part, pour l'objectif « écart à combler ».
  const inProgress = currentIncomplete && !beforeFloor
  let prevActsToDate = prevActs
  let asOf = null
  if (inProgress) {
    const day = now.getDate()
    if (period === 'year') {
      const m = now.getMonth()
      prevActsToDate = prevActs.filter((a) => {
        const am = localMonth(a.start_date_local)
        return am < m || (am === m && localParts(a.start_date_local).day <= day)
      })
      asOf = `${day} ${monthShort(m)}`
    } else {
      prevActsToDate = prevActs.filter((a) => localParts(a.start_date_local).day <= day)
      asOf = `${day} ${monthShort(month.month)}`
    }
  }

  // Blocage réel : uniquement quand la référence est hors de l'historique (rien à comparer).
  const reason = beforeFloor ? 'nohistory' : null
  return { prevActs, prevActsToDate, label, partial: !!reason, reason, inProgress, asOf }
}

// Objectif « écart à combler » : total de la période de référence COMPLÈTE vs le courant.
// Renvoie { cur, target, remaining, pct } ou null si la référence est vide.
export function computeProgress(periodActivities, refPrevActsFull, keep) {
  const sum = (arr) => arr.filter(keep).reduce((s, a) => s + (a.distance || 0), 0)
  const cur = sum(periodActivities), target = sum(refPrevActsFull)
  if (target <= 0) return null
  return { cur, target, remaining: Math.max(0, target - cur), pct: Math.min(1, cur / target) }
}

// Comparaison de distance globale (le "+X %"), filtre de familles respecté via `keep(activity)`.
export function computeComparison(periodActivities, refPrevActs, keep) {
  const sum = (arr) => arr.filter(keep).reduce((s, a) => s + (a.distance || 0), 0)
  const cur = sum(periodActivities), prev = sum(refPrevActs)
  if (prev <= 0 || cur <= 0) return null
  return { pct: Math.round(((cur - prev) / prev) * 100), cur, prev }
}

// Écarts de distance/D+ par famille de sport, filtre respecté via `keepKey(familyKey)`.
export function computeTypeCompareRows(periodActivities, refPrevActs, keepKey) {
  const group = (acts) => {
    const m = {}
    for (const a of acts) {
      const k = familyKey(a.type)
      if (!keepKey(k)) continue
      if (!m[k]) m[k] = { dist: 0, elev: 0 }
      m[k].dist += a.distance || 0
      m[k].elev += a.total_elevation_gain || 0
    }
    return m
  }
  const cur = group(periodActivities), prev = group(refPrevActs)
  return [...new Set([...Object.keys(cur), ...Object.keys(prev)])]
    .map((k) => {
      const c = cur[k] || { dist: 0, elev: 0 }
      const p = prev[k] || { dist: 0, elev: 0 }
      return {
        key: k, label: FAMILIES[k].label, color: FAMILIES[k].color,
        current: c.dist, previous: p.dist, delta: c.dist - p.dist, deltaElev: c.elev - p.elev,
      }
    })
    .sort((a, b) => Math.max(b.current, b.previous) - Math.max(a.current, a.previous))
}
