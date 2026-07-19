import { describe, it, expect } from 'vitest'
import { pickComparison, DIST_REFS, ELEV_REFS } from './recapCompare.js'

describe('recapCompare — pickComparison', () => {
  it('renvoie une référence au ratio parlant + ratio cohérent', () => {
    const c = pickComparison(ELEV_REFS, 5000, () => 0.5)
    expect(c).toBeTruthy()
    expect(c.ratio).toBeGreaterThanOrEqual(0.2)
    expect(c.ratio).toBeLessThanOrEqual(40)
    const ref = ELEV_REFS.find((r) => r.name === c.name)
    expect(c.ratio).toBeCloseTo(5000 / ref.m, 5)
  })

  it('total nul -> null', () => {
    expect(pickComparison(DIST_REFS, 0)).toBeNull()
  })

  it('total minuscule -> repli sur la plus proche (jamais null)', () => {
    const c = pickComparison(ELEV_REFS, 5)
    expect(c).toBeTruthy()
    expect(c.name).toBeTruthy()
  })

  it('le rng contrôle le choix dans le pool', () => {
    const first = pickComparison(DIST_REFS, 250000, () => 0)
    const last = pickComparison(DIST_REFS, 250000, () => 0.999)
    expect(first.name).not.toBe(last.name) // pool > 1 pour 250 km
  })
})
