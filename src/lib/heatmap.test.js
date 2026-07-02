import { describe, it, expect } from 'vitest'
import { monthHeatmap, yearHeatmap, intensity } from './heatmap.js'

describe('monthHeatmap', () => {
  it('couvre tous les jours du mois, en semaines de 7', () => {
    const h = monthHeatmap(2026, 6, { '2026-07-15': 12000 }) // juillet 2026
    expect(h.type).toBe('month')
    const days = h.weeks.flat().filter(Boolean)
    expect(days).toHaveLength(31)
    expect(h.weeks.every((w) => w.length === 7)).toBe(true)
    expect(h.max).toBe(12000)
    const d15 = days.find((c) => c.day === 15)
    expect(d15.value).toBe(12000)
    expect(days.find((c) => c.day === 16).value).toBe(0)
  })

  it('positionne le 1er du mois au bon jour de semaine (lundi=0)', () => {
    // 1er juillet 2026 = mercredi -> offset 2 -> 2 cellules nulles avant
    const h = monthHeatmap(2026, 6, {})
    expect(h.weeks[0].slice(0, 2)).toEqual([null, null])
    expect(h.weeks[0][2].day).toBe(1)
  })

  it('gère février bissextile', () => {
    const days = monthHeatmap(2024, 1, {}).weeks.flat().filter(Boolean)
    expect(days).toHaveLength(29)
  })
})

describe('yearHeatmap', () => {
  it('couvre 365 jours en colonnes de 7', () => {
    const h = yearHeatmap(2026, { '2026-03-10': 20000 })
    expect(h.type).toBe('year')
    const days = h.columns.flat().filter(Boolean)
    expect(days).toHaveLength(365)
    expect(h.columns.every((c) => c.length === 7)).toBe(true)
    expect(h.max).toBe(20000)
  })

  it('année bissextile = 366 jours', () => {
    const days = yearHeatmap(2024, {}).columns.flat().filter(Boolean)
    expect(days).toHaveLength(366)
  })
})

describe('intensity', () => {
  it('0 pour valeur nulle, paliers croissants', () => {
    expect(intensity(0, 100)).toBe(0)
    expect(intensity(10, 100)).toBe(1)
    expect(intensity(50, 100)).toBe(3)
    expect(intensity(100, 100)).toBe(4)
  })
})
