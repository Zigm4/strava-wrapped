import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  buildMonthsForYear, mostRecentMonth, buildYears, periodActivitiesOf,
  referencePeriod, computeComparison, computeTypeCompareRows, computeProgress,
  buildWeeks, makeWeek, mostRecentWeek, weekdayDistances, weekdayByType,
} from './selectors.js'
import { generateDemoActivities } from './demoData.js'
import { familyKey } from './activityTypes.js'
import { monthShort } from './format.js'

const acts = generateDemoActivities()

describe('selectors — période', () => {
  it('buildMonthsForYear renvoie 12 mois et marque le hors-historique', () => {
    const months = buildMonthsForYear(acts, 2025, { year: 2025, month: 3 })
    expect(months).toHaveLength(12)
    expect(months[0].outOfRange).toBe(true) // janvier < mars
    expect(months[3].outOfRange).toBe(false) // avril = floor
    expect(months.every((m) => m.key === `2025-${m.month}`)).toBe(true)
  })

  it('mostRecentMonth pointe le mois de la dernière activité', () => {
    const mr = mostRecentMonth(acts)
    expect(mr.year).toBeGreaterThanOrEqual(2025)
    expect(mr.month).toBeGreaterThanOrEqual(0)
    expect(mr.month).toBeLessThan(12)
  })

  it('buildYears trie décroissant, sans doublon', () => {
    const ys = buildYears(acts).map((y) => y.year)
    expect(new Set(ys).size).toBe(ys.length)
    expect([...ys].sort((a, b) => b - a)).toEqual(ys)
  })

  it('periodActivitiesOf filtre bien mois vs année', () => {
    const y = periodActivitiesOf(acts, 'year', 2025, null)
    expect(y.every((a) => a.start_date_local.slice(0, 4) === '2025')).toBe(true)
    const m = periodActivitiesOf(acts, 'month', 2025, { year: 2025, month: 4 })
    expect(m.every((a) => a.start_date_local.slice(0, 7) === '2025-05')).toBe(true)
  })
})

describe('selectors — comparaison', () => {
  const params = { activities: acts, period: 'month', year: 2025, month: { year: 2025, month: 4 }, dataFloor: { year: 2021, month: 6 } }

  it('referencePeriod prev = mois précédent', () => {
    const ref = referencePeriod(params, 'prev')
    expect(ref.label).toBe('avr.')
    expect(ref.prevActs.every((a) => a.start_date_local.slice(0, 7) === '2025-04')).toBe(true)
  })

  it('referencePeriod yoy = même mois an dernier', () => {
    const ref = referencePeriod(params, 'yoy')
    expect(ref.prevActs.every((a) => a.start_date_local.slice(0, 7) === '2024-05')).toBe(true)
  })

  it('referencePeriod partiel si hors historique', () => {
    const p2 = { ...params, month: { year: 2021, month: 6 } } // juillet 2021, floor -> juin 2021 précédent = hors
    const ref = referencePeriod(p2, 'prev')
    expect(ref.partial).toBe(true)
    expect(ref.reason).toBe('nohistory')
  })

  it('computeComparison renvoie pct + cur/prev, null si vide', () => {
    const cur = periodActivitiesOf(acts, 'month', 2025, { year: 2025, month: 4 })
    const ref = referencePeriod(params, 'prev')
    const cmp = computeComparison(cur, ref.prevActs, () => true)
    if (cmp) { expect(cmp.cur).toBeGreaterThan(0); expect(Number.isFinite(cmp.pct)).toBe(true) }
    expect(computeComparison([], ref.prevActs, () => true)).toBeNull()
  })

  it('computeTypeCompareRows : delta = current - previous', () => {
    const cur = periodActivitiesOf(acts, 'month', 2025, { year: 2025, month: 4 })
    const ref = referencePeriod(params, 'yoy')
    const rows = computeTypeCompareRows(cur, ref.prevActs, () => true)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.delta).toBeCloseTo(r.current - r.previous, 5)
  })

  it('keepKey filtre les familles', () => {
    const cur = periodActivitiesOf(acts, 'year', 2025, null)
    const rows = computeTypeCompareRows(cur, [], (k) => k === 'run')
    expect(rows.every((r) => r.key === 'run')).toBe(true)
  })
})

describe('selectors — comparaison « à date » (période en cours)', () => {
  afterEach(() => vi.useRealTimers())

  it('tronque la référence au même jour, ne bloque pas, et expose asOf', () => {
    vi.setSystemTime(new Date(2026, 6, 12)) // 12 juillet 2026 = mois en cours
    const cur = [
      { start_date_local: '2026-07-03T08:00:00Z', type: 'Run', distance: 10000 },
      { start_date_local: '2026-07-10T08:00:00Z', type: 'Run', distance: 10000 },
    ]
    const prevFull = [
      { start_date_local: '2025-07-05T08:00:00Z', type: 'Run', distance: 10000 },
      { start_date_local: '2025-07-20T08:00:00Z', type: 'Run', distance: 30000 }, // après le 12 -> hors « à date »
    ]
    const params = {
      activities: [...cur, ...prevFull], period: 'month', year: 2026,
      month: { year: 2026, month: 6 }, dataFloor: { year: 2021, month: 0 },
    }
    const ref = referencePeriod(params, 'yoy')
    expect(ref.partial).toBe(false)
    expect(ref.inProgress).toBe(true)
    expect(ref.prevActs).toHaveLength(2)        // référence complète
    expect(ref.prevActsToDate).toHaveLength(1)  // tronquée au 12
    expect(ref.asOf).toBe(`12 ${monthShort(6)}`)
    // % « à date » : 20 km courant vs 10 km référence-à-date -> +100 %
    expect(computeComparison(cur, ref.prevActsToDate, () => true).pct).toBe(100)
    // objectif « écart à combler » vs référence COMPLÈTE (40 km) : reste 20 km, 50 %
    const prog = computeProgress(cur, ref.prevActs, () => true)
    expect(prog.target).toBe(40000)
    expect(prog.remaining).toBe(20000)
    expect(prog.pct).toBeCloseTo(0.5, 5)
  })

  it('computeProgress plafonne à 100 % et remaining à 0 quand la cible est dépassée', () => {
    const cur = [{ start_date_local: '2026-07-03T08:00:00Z', type: 'Run', distance: 50000 }]
    const target = [{ start_date_local: '2025-07-03T08:00:00Z', type: 'Run', distance: 40000 }]
    const prog = computeProgress(cur, target, () => true)
    expect(prog.remaining).toBe(0)
    expect(prog.pct).toBe(1)
    expect(computeProgress(cur, [], () => true)).toBeNull() // référence vide -> pas d'objectif
  })
})

describe('selectors — semaine (lundi→dimanche)', () => {
  afterEach(() => vi.useRealTimers())

  const acts = [
    { start_date_local: '2026-07-06T07:00:00Z', type: 'Run', distance: 5000 },  // lundi (semaine courante)
    { start_date_local: '2026-07-08T18:00:00Z', type: 'Run', distance: 8000 },  // mercredi (semaine courante)
    { start_date_local: '2026-07-12T09:00:00Z', type: 'Run', distance: 21000 }, // dimanche (semaine courante)
    { start_date_local: '2026-07-05T09:00:00Z', type: 'Run', distance: 3000 },  // dimanche précédent (semaine d'avant)
    { start_date_local: '2026-07-13T09:00:00Z', type: 'Run', distance: 4000 },  // lundi suivant (semaine future)
  ]

  it('groupe par semaine lundi→dimanche, labels et comptes', () => {
    vi.setSystemTime(new Date(2026, 6, 8)) // mercredi 8 juillet 2026 -> semaine 6–12 juil.
    const weeks = buildWeeks(acts, { year: 2020, month: 0 }, 3)
    expect(weeks[0].label).toBe('6–12 juil.')
    expect(weeks[0].count).toBe(3)               // lundi + mercredi + dimanche
    expect(weeks[1].label).toBe('29 juin – 5 juil.') // semaine précédente, à cheval sur 2 mois
    expect(weeks[1].count).toBe(1)               // le dimanche 5 juil.
  })

  it('periodActivitiesOf filtre la semaine sélectionnée', () => {
    vi.setSystemTime(new Date(2026, 6, 8))
    const weeks = buildWeeks(acts, null, 3)
    const inWeek = periodActivitiesOf(acts, 'week', null, null, weeks[0])
    expect(inWeek).toHaveLength(3)
    expect(inWeek.some((a) => a.start_date_local.startsWith('2026-07-13'))).toBe(false) // lundi suivant exclu
  })

  it('weekdayDistances : lundi→dimanche', () => {
    const wd = weekdayDistances([
      { start_date_local: '2026-07-06T07:00:00Z', distance: 5000 },  // lundi -> idx 0
      { start_date_local: '2026-07-08T18:00:00Z', distance: 8000 },  // mercredi -> idx 2
      { start_date_local: '2026-07-12T09:00:00Z', distance: 21000 }, // dimanche -> idx 6
    ])
    expect(wd[0]).toBe(5000)
    expect(wd[2]).toBe(8000)
    expect(wd[6]).toBe(21000)
    expect(wd[1]).toBe(0)
  })

  it('weekdayByType : segments par famille, triés desc, avec couleur', () => {
    const acts = [
      { start_date_local: '2026-07-12T09:00:00Z', type: 'Ride', distance: 30000 }, // dim. vélo
      { start_date_local: '2026-07-12T15:00:00Z', type: 'Run', distance: 10000 },   // dim. course
      { start_date_local: '2026-07-06T08:00:00Z', type: 'Run', distance: 8000 },    // lun. course
    ]
    const w = weekdayByType(acts)
    expect(w).toHaveLength(7)
    expect(w[6].total).toBe(40000)              // dimanche = idx 6
    expect(w[6].segs).toHaveLength(2)
    expect(w[6].segs[0].key).toBe('ride')       // vélo (30k) avant course (10k)
    expect(w[6].segs[0].dist).toBe(30000)
    expect(w[6].segs[0].color).toBeTruthy()
    expect(w[6].segs[1].key).toBe('run')
    expect(w[0].total).toBe(8000)               // lundi = 1 segment
    expect(w[0].segs).toHaveLength(1)
    expect(w[1].total).toBe(0)                  // mardi = repos
    expect(w[1].segs).toHaveLength(0)
  })

  it('mostRecentWeek borne à la semaine courante', () => {
    vi.setSystemTime(new Date(2026, 6, 8)) // l'activité la plus récente (13 juil.) est la semaine suivante
    const w = makeWeek(mostRecentWeek(acts).mondayOrdinal)
    expect(w.label).toBe('6–12 juil.') // bornée à la semaine courante
  })
})
