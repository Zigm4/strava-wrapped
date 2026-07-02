import { describe, it, expect } from 'vitest'
import { buildSnapshot, hydrateSnapshot, encodeShare, decodeShare } from './share.js'
import { aggregate } from './aggregate.js'
import { generateDemoActivities } from './demoData.js'
import { BACKGROUNDS, ACCENTS } from '../data/backgrounds.js'

function sampleProps() {
  const acts = generateDemoActivities()
  const summary = aggregate(acts, null, null)
  return {
    summary, formatId: 'story', bgId: 'sunset', accentId: 'flame', theme: 'dark', scrim: 0.45,
    periodLabel: 'juin 2026', title: 'Mon mois', handle: '@moi', privacy: true,
    spot: { name: 'Innsbruck', region: 'Tyrol · Autriche', type: 'run', count: 12, distance: 120000, elevation: 3400 },
    comparison: { pct: 17, label: 'mai' }, showDeltas: false, typeCompare: { rows: [], label: 'mai' },
    showHeatmap: false, heatmap: null,
  }
}

describe('share — encode/decode round-trip', () => {
  it('un instantané se compresse et se relit à l\'identique', () => {
    const snap = buildSnapshot(sampleProps())
    const encoded = encodeShare(snap)
    const decoded = decodeShare(encoded)
    expect(decoded).toEqual(snap)
  })

  it('le lien reste raisonnable (< 8 Ko)', () => {
    const encoded = encodeShare(buildSnapshot(sampleProps()))
    expect(encoded.length).toBeLessThan(8000)
  })

  it('decodeShare renvoie null sur une entrée invalide', () => {
    expect(decodeShare('pas-du-lz-string!!!')).toBeNull()
    expect(decodeShare('')).toBeNull()
  })

  it('hydrate reconstruit des props StoryCard valides', () => {
    const snap = buildSnapshot(sampleProps())
    const props = hydrateSnapshot(snap, BACKGROUNDS, ACCENTS)
    expect(props.summary.count).toBeGreaterThan(0)
    expect(props.background.id).toBe('sunset')
    expect(props.accent.id).toBe('flame')
    expect(props.periodLabel).toBe('juin 2026')
    expect(props.privacy).toBe(true)
    // les totaux clés survivent
    expect(props.summary.totalDistance).toBe(snap.su.totalDistance)
    expect(Array.isArray(props.summary.byType)).toBe(true)
  })
})
