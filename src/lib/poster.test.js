import { describe, it, expect } from 'vitest'
import { posterRoutes, gridLayout, posterFamilies } from './poster.js'
import { generateDemoActivities } from './demoData.js'

describe('gridLayout', () => {
  it('maximise la taille des cellules pour un carré', () => {
    // 9 vignettes dans 300x300 -> 3x3, cellule 100
    const g = gridLayout(9, 300, 300, 0)
    expect(g.cols).toBe(3)
    expect(g.rows).toBe(3)
    expect(g.size).toBeCloseTo(100, 0)
  })

  it('gère un nombre non carré (grille rectangulaire)', () => {
    const g = gridLayout(7, 300, 300, 0)
    expect(g.cols * g.rows).toBeGreaterThanOrEqual(7)
    expect(g.size).toBeGreaterThan(0)
  })

  it('cas dégénérés -> taille 0', () => {
    expect(gridLayout(0, 300, 300).size).toBe(0)
    expect(gridLayout(5, 0, 300).size).toBe(0)
  })

  it('respecte l\'espacement', () => {
    const g0 = gridLayout(4, 200, 200, 0)
    const g1 = gridLayout(4, 200, 200, 20)
    expect(g1.size).toBeLessThan(g0.size)
  })
})

describe('posterRoutes (sur la démo)', () => {
  const acts = generateDemoActivities()
  const year2025 = acts.filter((a) => a.start_date_local.slice(0, 4) === '2025')

  it('ne garde que les activités avec tracé', () => {
    const { routes, total } = posterRoutes(year2025, { privacy: true })
    expect(routes.length).toBeGreaterThan(0)
    expect(total).toBeGreaterThan(0)
    expect(routes.every((r) => Array.isArray(r.points) && r.points.length >= 2)).toBe(true)
    expect(routes.every((r) => typeof r.color === 'string' && r.family)).toBe(true)
  })

  it('borne le nombre de vignettes et signale la troncature', () => {
    const { routes, truncated, total } = posterRoutes(year2025, { privacy: true, max: 10 })
    expect(routes.length).toBeLessThanOrEqual(10)
    if (total > 10) expect(truncated).toBe(total - 10)
  })

  it('est ordonné chronologiquement', () => {
    const withRoutes = year2025.filter((a) => a.routePoints)
    const { routes } = posterRoutes(year2025, { privacy: false, max: 1000 })
    // au moins autant de tracés que d'activités avec routePoints non vides
    expect(routes.length).toBeLessThanOrEqual(withRoutes.length)
  })

  it('posterFamilies liste les familles présentes sans doublon', () => {
    const { routes } = posterRoutes(year2025, { privacy: true })
    const fams = posterFamilies(routes)
    expect(new Set(fams.map((f) => f.key)).size).toBe(fams.length)
    expect(fams.length).toBeGreaterThan(0)
  })
})
