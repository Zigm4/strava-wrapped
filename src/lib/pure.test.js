import { describe, it, expect } from 'vitest'
import { decodePolyline, trimRoute, normalizeRoutes, pointsToPath } from './polyline.js'
import { fmtKm, fmtPace, fmtSpeed, fmtDuration, fmtHours, fmtElev, fmtInt } from './format.js'
import { familyKey } from './activityTypes.js'
import { aggregate, personalBestIds, availableFamilies } from './aggregate.js'
import { generateDemoActivities } from './demoData.js'

describe('polyline', () => {
  it('décode un polyline Google connu', () => {
    // Exemple canonique de la doc Google : "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
    expect(pts).toHaveLength(3)
    expect(pts[0][0]).toBeCloseTo(38.5, 5)
    expect(pts[0][1]).toBeCloseTo(-120.2, 5)
    expect(pts[2][0]).toBeCloseTo(43.252, 3)
  })

  it('decodePolyline gère la chaîne vide', () => {
    expect(decodePolyline('')).toEqual([])
    expect(decodePolyline(null)).toEqual([])
  })

  it('trimRoute rogne départ et arrivée (points à > r du bord conservés)', () => {
    // Ligne droite ~ nord, ~111 m entre points (0.001 deg de lat).
    const pts = Array.from({ length: 12 }, (_, i) => [45 + i * 0.001, 6])
    const trimmed = trimRoute(pts, 300)
    expect(trimmed.length).toBeLessThan(pts.length)
    expect(trimmed.length).toBeGreaterThanOrEqual(2)
  })

  it('trimRoute : route entièrement proche du domicile -> null (pas de fuite)', () => {
    // 8 points tous dans un rayon de ~20 m.
    const pts = Array.from({ length: 8 }, (_, i) => [45 + i * 0.00005, 6])
    expect(trimRoute(pts, 300)).toBeNull()
  })

  it('trimRoute : route trop courte / sans milieu -> null (pas de fuite)', () => {
    expect(trimRoute([[45, 6], [45.001, 6]], 300)).toBeNull()
    expect(trimRoute(null, 300)).toBeNull()
  })

  it('trimRoute : longue route de rando garde un milieu affichable', () => {
    // 60 points sur ~6,6 km : les extrémités sont rognées, le milieu reste.
    const pts = Array.from({ length: 60 }, (_, i) => [45 + i * 0.001, 6])
    const trimmed = trimRoute(pts, 300)
    expect(trimmed).not.toBeNull()
    expect(trimmed.length).toBeGreaterThan(2)
  })

  it('normalizeRoutes + pointsToPath produisent un path SVG', () => {
    const pts = [[45, 6], [45.01, 6.01], [45.02, 6]]
    const norm = normalizeRoutes([pts], 100, 100)[0]
    const path = pointsToPath(norm)
    expect(path.startsWith('M')).toBe(true)
    expect(path).toContain('L')
  })
})

describe('format (fr)', () => {
  it('fmtKm : mètres -> km, virgule décimale', () => {
    expect(fmtKm(5230)).toBe('5,2')
    expect(fmtKm(0)).toBe('0,0')
  })

  it('fmtPace corrige le "3:60" d\'arrondi', () => {
    // vitesse telle que 1000/v ~ 3 min 59,7 s -> ne doit pas donner 3:60
    const pace = fmtPace(1000 / 239.7)
    expect(pace).not.toContain(':60')
  })

  it('fmtPace / fmtSpeed : valeur nulle -> "-"', () => {
    expect(fmtPace(0)).toBe('-')
    expect(fmtSpeed(0)).toBe('-')
  })

  it('fmtDuration : heures et minutes', () => {
    expect(fmtDuration(3661)).toBe('1h01')
    expect(fmtDuration(2820)).toBe('47 min')
  })

  it('fmtInt / fmtElev arrondissent', () => {
    expect(fmtInt(12.6)).toBe('13')
    expect(fmtElev(340.4)).toBe('340')
  })
})

describe('activityTypes', () => {
  it('mappe les types Strava vers des familles', () => {
    expect(familyKey('TrailRun')).toBe('run')
    expect(familyKey('GravelRide')).toBe('ride')
    expect(familyKey('WeightTraining')).toBe('workout')
    expect(familyKey('Inconnu')).toBe('other')
  })
})

describe('aggregate (sur la démo déterministe)', () => {
  const acts = generateDemoActivities()

  it('la démo produit des activités', () => {
    expect(acts.length).toBeGreaterThan(100)
  })

  it('agrège distance/comptage cohérents', () => {
    const s = aggregate(acts, null, null)
    expect(s.count).toBe(acts.length)
    expect(s.totalDistance).toBeGreaterThan(0)
    expect(s.byType.length).toBeGreaterThan(0)
    expect(s.activeDays).toBeGreaterThan(0)
    expect(s.activeDays).toBeLessThanOrEqual(s.count)
  })

  it('respecte le filtre de familles', () => {
    const s = aggregate(acts, new Set(['run']), null)
    expect(s.byType.every((t) => t.key === 'run')).toBe(true)
  })

  it('streak >= 1 et weekendShare dans [0,1]', () => {
    const s = aggregate(acts, null, null)
    expect(s.streak).toBeGreaterThanOrEqual(1)
    expect(s.weekendShare).toBeGreaterThanOrEqual(0)
    expect(s.weekendShare).toBeLessThanOrEqual(1)
  })

  it('personalBestIds renvoie un Set d\'ids existants', () => {
    const ids = personalBestIds(acts)
    expect(ids.size).toBeGreaterThan(0)
    const known = new Set(acts.map((a) => a.id))
    for (const id of ids) expect(known.has(id)).toBe(true)
  })

  it('availableFamilies est ordonné et sans doublon', () => {
    const fams = availableFamilies(acts)
    expect(new Set(fams).size).toBe(fams.length)
    expect(fams).toContain('run')
  })

  it('liste vide -> résumé neutre', () => {
    const s = aggregate([], null, null)
    expect(s.count).toBe(0)
    expect(s.totalDistance).toBe(0)
  })
})
