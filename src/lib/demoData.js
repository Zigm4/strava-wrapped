// Génère ~5 ans d'activités réalistes pour la démo (bilans mensuels et annuels).
// Déterministe (seed fixe) pour que la carte ne se réorganise pas à chaque rendu.

import { toStravaLocal } from './date.js'

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SPOTS = {
  run: [
    { city: 'Innsbruck', ll: [47.2692, 11.4041] },
    { city: 'Innsbruck', ll: [47.265, 11.39] },
    { city: 'Igls', ll: [47.2333, 11.4167] },
    { city: 'Hungerburg', ll: [47.2833, 11.4] },
  ],
  ride: [
    { city: 'Achensee', ll: [47.45, 11.7] },
    { city: 'Seefeld', ll: [47.3289, 11.1881] },
    { city: 'Innsbruck', ll: [47.2692, 11.4041] },
    { city: 'Stubaital', ll: [47.1, 11.3] },
  ],
  hike: [
    { city: 'Patscherkofel', ll: [47.2083, 11.4611] },
    { city: 'Axamer Lizum', ll: [47.18, 11.3] },
    { city: 'Nordkette', ll: [47.31, 11.39] },
  ],
  swim: [{ city: 'Innsbruck', ll: [47.2692, 11.4041] }, { city: 'Baggersee', ll: [47.24, 11.35] }],
  workout: [{ city: 'Innsbruck', ll: [47.2692, 11.4041] }],
}

const NAMES = {
  run: ['Footing matinal', 'Sortie longue', 'Fractionné piste', 'Run récup', 'Trail Nordkette', 'Tempo run', 'Sortie au lever du soleil'],
  ride: ['Tour du lac', 'Col du Brenner', 'Sortie longue', 'Montée Patscherkofel', 'Gravel Stubaital', 'Sortie groupe', 'Aller-retour Seefeld'],
  hike: ['Rando Patscherkofel', 'Sommet Nordkette', 'Boucle Axamer', 'Lever de soleil en montagne'],
  swim: ['Natation', 'Longueurs', 'Eau libre Baggersee'],
  workout: ['Renfo', 'Séance PPG', 'Mobilité + gainage'],
}

// noms quand l'activité est taguée "compétition"
const RACE_NAMES = {
  run: ['10 km route', 'Semi-marathon', 'Trail des Alpes', 'Marathon', '5 km chrono', 'Course sur route'],
  ride: ['Cyclosportive', 'Contre-la-montre', 'Granfondo', 'Course sur route'],
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)] }
function between(rng, a, b) { return a + rng() * (b - a) }

// Trace une boucle plausible autour du point de départ.
function makeRoute(rng, start, distanceKm, loop) {
  const pts = []
  let lat = start[0], lng = start[1]
  const steps = 46
  let dir = rng() * Math.PI * 2
  const span = Math.min(distanceKm, 30)
  const stepLen = (span / steps) / 111 // ~deg
  for (let i = 0; i < steps; i++) {
    // si boucle : on ramène doucement vers le départ sur la 2e moitié
    if (loop && i > steps / 2) {
      const target = Math.atan2(start[0] - lat, start[1] - lng)
      dir = dir * 0.7 + target * 0.3
    }
    dir += (rng() - 0.5) * 0.5
    lat += Math.cos(dir) * stepLen
    lng += Math.sin(dir) * stepLen / Math.cos((lat * Math.PI) / 180)
    pts.push([lat, lng])
  }
  return pts
}

function makeActivity(rng, type, date, id) {
  let distance, speed, elev
  switch (type) {
    case 'run': {
      const long = rng() > 0.82
      distance = (long ? between(rng, 16, 24) : between(rng, 5, 13)) * 1000
      speed = between(rng, 2.75, 3.7)
      elev = between(rng, 20, long ? 520 : 220)
      break
    }
    case 'ride': {
      const long = rng() > 0.6
      distance = (long ? between(rng, 55, 110) : between(rng, 22, 48)) * 1000
      speed = between(rng, 6.1, 8.3)
      elev = between(rng, 150, long ? 1700 : 700)
      break
    }
    case 'hike': {
      distance = between(rng, 6, 17) * 1000
      speed = between(rng, 0.95, 1.4)
      elev = between(rng, 450, 1300)
      break
    }
    case 'swim': {
      distance = between(rng, 1.0, 2.8) * 1000
      speed = between(rng, 0.85, 1.25)
      elev = 0
      break
    }
    default: { distance = 0; speed = 0; elev = 0 }
  }
  const moving_time = type === 'workout' ? Math.round(between(rng, 1800, 3900)) : Math.round(distance / speed)
  const spot = pick(rng, SPOTS[type])
  const jitter = () => (rng() - 0.5) * 0.02
  const start_latlng = [spot.ll[0] + jitter(), spot.ll[1] + jitter()]
  const hasRoute = type !== 'workout' && type !== 'swim'
  const raceRoll = rng()
  const race = (type === 'run' && raceRoll > 0.85) || (type === 'ride' && raceRoll > 0.92)
  const workout_type = type === 'run' ? (race ? 1 : 0) : type === 'ride' ? (race ? 11 : 10) : null
  return {
    id,
    name: race ? pick(rng, RACE_NAMES[type]) : pick(rng, NAMES[type]),
    type: type === 'run' && rng() > 0.7 ? 'TrailRun' : type === 'ride' && rng() > 0.7 ? 'GravelRide' : capitalize(type),
    workout_type,
    distance: Math.round(distance),
    moving_time,
    elapsed_time: Math.round(moving_time * between(rng, 1.03, 1.25)),
    total_elevation_gain: Math.round(elev),
    total_elevation_loss: Math.round(elev * between(rng, 0.9, 1.1)),
    // heure murale locale + "Z", comme le fait l'API Strava (voir lib/date.js)
    start_date_local: toStravaLocal(date),
    average_speed: speed,
    max_speed: speed * between(rng, 1.3, 1.9),
    location_city: spot.city,
    location_state: 'Tyrol',
    location_country: 'Autriche',
    start_latlng,
    routePoints: hasRoute ? makeRoute(rng, start_latlng, distance / 1000, type !== 'ride') : null,
    achievement_count: Math.floor(rng() * 5),
    pr_count: race ? (rng() > 0.35 ? 1 + Math.floor(rng() * 2) : 0) : (rng() > 0.78 ? Math.floor(rng() * 2) : 0),
    kudos_count: Math.floor(between(rng, 6, 64)),
    calories: Math.round((distance / 1000) * between(rng, 55, 75) + (moving_time / 60) * 6),
  }
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function generateDemoActivities() {
  const rng = mulberry32(20260601)
  const out = []
  const today = new Date()
  let id = 1000

  for (let back = 0; back < 1825; back++) {
    const date = new Date(today)
    date.setDate(today.getDate() - back)
    const dow = date.getDay()

    const day = []
    if (rng() > 0.42) day.push('run')
    if ((dow === 6 || dow === 0) && rng() > 0.35) day.push(rng() > 0.45 ? 'ride' : 'hike')
    if (dow !== 6 && dow !== 0 && rng() > 0.86) day.push('ride')
    if (rng() > 0.9) day.push('swim')
    if (rng() > 0.92) day.push('workout')

    day.forEach((type, i) => {
      const d = new Date(date)
      d.setHours(7 + i * 4, Math.floor(rng() * 59), 0, 0)
      out.push(makeActivity(rng, type, d, id++))
    })
  }

  return out.sort((a, b) => new Date(b.start_date_local) - new Date(a.start_date_local))
}
