import { familyKey, FAMILIES, FAMILY_ORDER } from './activityTypes.js'
import { dayLabel } from './format.js'
import { localDayKey as dayKey, localWeekday, localHour, localDayNumber } from './date.js'
import { haversineKm } from './geo.js'

// Calcule tout le récap à partir d'une liste d'activités normalisées,
// filtrée par les familles sélectionnées (`selected` = Set de clés, ou null = tout).
// Distance "normalisée" pour regrouper des efforts comparables.
function distanceBucket(fam, meters) {
  const km = meters / 1000
  if (fam === 'run' || fam === 'hike' || fam === 'walk') {
    for (const d of [5, 10, 15, 21.1, 42.2]) if (Math.abs(km - d) <= d * 0.08) return String(d)
    return String(Math.round(km))
  }
  if (fam === 'ride') return String(Math.round(km / 10) * 10)
  if (fam === 'swim') return String(Math.round(km * 10) / 10)
  return String(Math.round(km))
}

// IDs des activités qui sont des records perso : la meilleure allure/vitesse sur leur distance,
// calculé sur TOUT l'historique fourni (pas seulement la période affichée).
export function personalBestIds(activities) {
  const best = {}
  for (const a of activities) {
    if (!a.average_speed || !a.distance) continue
    const key = `${familyKey(a.type)}:${distanceBucket(familyKey(a.type), a.distance)}`
    if (!best[key] || a.average_speed > best[key].speed) best[key] = { id: a.id, speed: a.average_speed }
  }
  return new Set(Object.values(best).map((b) => b.id))
}

export function aggregate(activities, selected, recordIds) {
  const list = activities.filter((a) => !selected || selected.has(familyKey(a.type)))

  const summary = {
    count: list.length,
    totalDistance: 0,
    totalElevation: 0,
    totalElevationLoss: 0,
    totalMovingTime: 0,
    totalCalories: 0,
    achievements: 0,
    prCount: 0,
    kudos: 0,
    byType: [],
    records: {},
    races: [],
    favoriteSpot: null,
    heroRoute: null,
    activeDays: 0,
    streak: 0,
    dominantFamily: null,
    weekendShare: 0,
    dayPart: null,
  }

  if (list.length === 0) return summary

  const byKey = {}
  const dayDist = {}
  const daySet = new Set()
  const routed = []

  let longest = null, biggestClimb = null, longestTime = null
  let bestRun = null, bestRide = null

  for (const a of list) {
    const k = familyKey(a.type)
    summary.totalDistance += a.distance || 0
    summary.totalElevation += a.total_elevation_gain || 0
    summary.totalElevationLoss += a.total_elevation_loss || a.total_elevation_gain || 0
    summary.totalMovingTime += a.moving_time || 0
    summary.totalCalories += a.calories || 0
    summary.achievements += a.achievement_count || 0
    summary.prCount += a.pr_count || 0
    summary.kudos += a.kudos_count || 0

    if (!byKey[k]) byKey[k] = { ...FAMILIES[k], distance: 0, count: 0, time: 0, elevation: 0 }
    byKey[k].distance += a.distance || 0
    byKey[k].count += 1
    byKey[k].time += a.moving_time || 0
    byKey[k].elevation += a.total_elevation_gain || 0

    if (a.routePoints && a.routePoints.length > 1) routed.push(a)

    const d = dayKey(a.start_date_local)
    daySet.add(d)
    dayDist[d] = (dayDist[d] || 0) + (a.distance || 0)

    if (!longest || a.distance > longest.distance) longest = a
    if (!biggestClimb || a.total_elevation_gain > biggestClimb.total_elevation_gain) biggestClimb = a
    if (!longestTime || a.moving_time > longestTime.moving_time) longestTime = a
    if (k === 'run' && (!bestRun || a.average_speed > bestRun.average_speed)) bestRun = a
    if (k === 'ride' && (!bestRide || a.average_speed > bestRide.average_speed)) bestRide = a
  }

  summary.byType = Object.values(byKey).sort((x, y) => y.distance - x.distance)
  summary.dominantFamily = summary.byType[0]?.key || null

  // --- spot favori : zone GPS la plus fréquentée (grille fixe, sans chaînage) ---
  const spot = findSpot(list)
  if (spot) {
    // activité représentative = la plus longue DU SPOT qui a un tracé.
    // Ville ET carte en dérivent (on géocode son départ) -> jamais de décalage.
    const rep = spot.acts
      .filter((a) => a.routePoints && a.routePoints.length > 1)
      .sort((x, y) => (y.distance || 0) - (x.distance || 0))[0]
    summary.favoriteSpot = {
      count: spot.acts.length,
      distance: spot.acts.reduce((s, a) => s + (a.distance || 0), 0),
      elevation: spot.acts.reduce((s, a) => s + (a.total_elevation_gain || 0), 0),
      latlng: rep ? rep.start_latlng : spot.anchor, // point géocodé = départ du tracé montré
      city: rep?.location_city ?? mode(spot.acts.map((a) => a.location_city)),
      state: rep?.location_state ?? mode(spot.acts.map((a) => a.location_state)),
      country: rep?.location_country ?? mode(spot.acts.map((a) => a.location_country)),
      topType: mode(spot.acts.map((a) => familyKey(a.type))),
    }
    summary.heroRoute = rep ? rep.routePoints : null
  }

  // active days + plus longue série
  summary.activeDays = daySet.size
  summary.streak = longestStreak([...daySet])
  summary.dailyDistance = dayDist // { 'YYYY-MM-DD': mètres } pour la heatmap calendrier

  // jour le plus actif (en distance)
  const topDay = Object.entries(dayDist).sort((a, b) => b[1] - a[1])[0]

  summary.records = {
    longest: longest && { activity: longest, distance: longest.distance },
    biggestClimb: biggestClimb && { activity: biggestClimb, elevation: biggestClimb.total_elevation_gain },
    longestTime: longestTime && { activity: longestTime, time: longestTime.moving_time },
    bestRun: bestRun && { activity: bestRun, speed: bestRun.average_speed },
    bestRide: bestRide && { activity: bestRide, speed: bestRide.average_speed },
    topDay: topDay && { day: dayLabel(topDay[0]), distance: topDay[1] },
  }

  // compétitions : activités taguées "Race" sur Strava (workout_type 1 = course à pied, 11 = vélo)
  summary.races = list
    .filter((a) => a.workout_type === 1 || a.workout_type === 11)
    .map((a) => ({
      name: a.name,
      family: familyKey(a.type),
      distance: a.distance || 0,
      time: a.moving_time || 0,
      speed: a.average_speed || 0,
      isRecord: recordIds ? recordIds.has(a.id) : false,
    }))
    .sort((x, y) => (y.isRecord - x.isRecord) || (y.distance - x.distance))

  // narratif : part du week-end + moment de la journée préféré
  let weekendCount = 0
  const parts = {}
  for (const a of list) {
    const wd = localWeekday(a.start_date_local)
    if (wd === 0 || wd === 6) weekendCount++
    const h = localHour(a.start_date_local)
    const part = h < 5 ? 'nuit' : h < 11 ? 'matin' : h < 14 ? 'midi' : h < 18 ? 'après-midi' : h < 23 ? 'soir' : 'nuit'
    parts[part] = (parts[part] || 0) + 1
  }
  summary.weekendShare = weekendCount / list.length
  summary.dayPart = Object.entries(parts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  return summary
}

// Spot favori : cellule de grille (~3 km) la plus fréquentée, puis toutes les sorties
// à <=5 km de son point de départ réel le plus central. Grille fixe = pas de chaînage.
function findSpot(list) {
  const pts = list.filter((a) => a.start_latlng)
  if (!pts.length) return null
  const cells = {}
  for (const a of pts) {
    const k = `${Math.round(a.start_latlng[0] / 0.03)},${Math.round(a.start_latlng[1] / 0.03)}`
    ;(cells[k] || (cells[k] = [])).push(a)
  }
  const densest = Object.values(cells).sort((x, y) => y.length - x.length)[0]
  const mLat = densest.reduce((s, a) => s + a.start_latlng[0], 0) / densest.length
  const mLng = densest.reduce((s, a) => s + a.start_latlng[1], 0) / densest.length
  // ancre = départ réel le plus central (médoïde) -> géocodage fiable d'un point existant
  let anchor = densest[0].start_latlng, best = Infinity
  for (const a of densest) {
    const d = haversineKm(mLat, mLng, a.start_latlng[0], a.start_latlng[1])
    if (d < best) { best = d; anchor = a.start_latlng }
  }
  const acts = pts.filter((a) => haversineKm(anchor[0], anchor[1], a.start_latlng[0], a.start_latlng[1]) <= 5)
  return { anchor, acts }
}

// valeur la plus fréquente (ignore null/undefined)
function mode(arr) {
  const counts = {}
  let best = null, bestN = 0
  for (const v of arr) {
    if (!v) continue
    counts[v] = (counts[v] || 0) + 1
    if (counts[v] > bestN) { bestN = counts[v]; best = v }
  }
  return best
}

function longestStreak(dayKeys) {
  if (!dayKeys.length) return 0
  const days = dayKeys
    .map((d) => localDayNumber(d))
    .sort((a, b) => a - b)
  let best = 1, cur = 1
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + 1) cur++
    else if (days[i] !== days[i - 1]) cur = 1
    best = Math.max(best, cur)
  }
  return best
}

// liste ordonnée des familles présentes dans un jeu d'activités (pour les filtres)
export function availableFamilies(activities) {
  const present = new Set(activities.map((a) => familyKey(a.type)))
  return FAMILY_ORDER.filter((k) => present.has(k))
}
