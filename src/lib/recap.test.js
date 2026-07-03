import { describe, it, expect } from 'vitest'
import { buildRecap, monthlyDistances } from './recap.js'
import { aggregate } from './aggregate.js'
import { generateDemoActivities } from './demoData.js'

describe('monthlyDistances', () => {
  it('somme par mois pour l\'année demandée', () => {
    const daily = { '2025-01-05': 10000, '2025-01-20': 5000, '2025-03-02': 8000, '2024-01-01': 99999 }
    const m = monthlyDistances(daily, 2025)
    expect(m).toHaveLength(12)
    expect(m[0]).toBe(15000) // janvier
    expect(m[2]).toBe(8000) // mars
    expect(m[1]).toBe(0)
    expect(m.reduce((a, b) => a + b, 0)).toBe(23000) // ignore 2024
  })
})

describe('buildRecap (sur la démo)', () => {
  const acts = generateDemoActivities()
  const year2025 = acts.filter((a) => a.start_date_local.slice(0, 4) === '2025')
  const summary = aggregate(year2025, null, null)

  it('produit une séquence de slides non vides', () => {
    const slides = buildRecap(summary, { period: 'year', year: 2025, periodLabel: '2025', athleteName: 'Jimmy' })
    expect(slides.length).toBeGreaterThanOrEqual(6)
    expect(slides[0].kind).toBe('cover')
    expect(slides[slides.length - 1].kind).toBe('final')
    const kinds = slides.map((s) => s.kind)
    expect(kinds).toContain('distance')
    expect(kinds).toContain('sports')
    expect(kinds).toContain('months') // année -> slide mensuelle présente
  })

  it('la slide months n\'apparaît pas pour une période mensuelle', () => {
    const may = acts.filter((a) => a.start_date_local.slice(0, 7) === '2025-05')
    const s = aggregate(may, null, null)
    const slides = buildRecap(s, { period: 'month', periodLabel: 'mai 2025' })
    expect(slides.map((x) => x.kind)).not.toContain('months')
  })

  it('renvoie une liste vide si aucune activité', () => {
    const s = aggregate([], null, null)
    expect(buildRecap(s, { period: 'year', year: 2025 })).toEqual([])
  })

  it('la slide route porte des points de tracé', () => {
    const slides = buildRecap(summary, { period: 'year', year: 2025, periodLabel: '2025' })
    const route = slides.find((s) => s.kind === 'route')
    if (route) {
      expect(Array.isArray(route.points)).toBe(true)
      expect(route.points.length).toBeGreaterThan(1)
    }
  })
})
