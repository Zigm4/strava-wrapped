// Modèle du récap vidéo : décide des slides à jouer et prépare leurs données.
// Pur (pas de canvas, pas de React). Le rendu est dans lib/recapRender.js.

import { trimRoute } from './polyline.js'
import { posterRoutes } from './poster.js'

const EVEREST_M = 8849

// Distances mensuelles (12 cases) pour une année, à partir de { 'YYYY-MM-DD': mètres }.
export function monthlyDistances(daily = {}, year) {
  const m = new Array(12).fill(0)
  for (const k in daily) {
    if (+k.slice(0, 4) === year) m[+k.slice(5, 7) - 1] += daily[k] || 0
  }
  return m
}

// Construit la liste ordonnée des slides. On saute une slide si sa donnée est absente,
// pour ne jamais montrer d'écran vide.
export function buildRecap(summary, ctx = {}) {
  const {
    period = 'year', year, periodLabel = '', athleteName = null, privacy = true,
    comparison = null, typeCompare = null, compareMode = 'off', heatmap = null, activities = [],
  } = ctx
  const slides = []
  if (!summary || summary.count === 0) return slides

  slides.push({
    kind: 'cover',
    title: athleteName ? `Le Rewind de ${athleteName}` : 'Ton Rewind',
    big: periodLabel,
    sub: period === 'year' ? 'Ton année en mouvement' : 'Ton mois en mouvement',
  })

  if (summary.totalDistance > 0) {
    slides.push({ kind: 'distance', value: summary.totalDistance, count: summary.count, activeDays: summary.activeDays })
  }

  const sports = (summary.byType || [])
    .filter((t) => t.distance > 0)
    .slice(0, 4)
    .map((t) => ({ key: t.key, label: t.label, color: t.color, distance: t.distance, count: t.count }))
  if (sports.length) {
    const dom = summary.byType?.[0]
    slides.push({ kind: 'sports', sports, dominant: summary.dominantFamily, dominantLabel: dom?.label || null, max: Math.max(...sports.map((s) => s.distance)) })
  }

  // Comparaison : seulement si l'utilisateur a activé un mode ET que la comparaison est fiable.
  if (compareMode && compareMode !== 'off' && comparison && Number.isFinite(comparison.pct)) {
    const rows = (typeCompare?.rows || [])
      .filter((r) => r.current > 0 || r.previous > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
      .map((r) => ({ label: r.label, color: r.color, delta: r.delta }))
    slides.push({ kind: 'compare', pct: comparison.pct, label: comparison.label, cur: comparison.cur, prev: comparison.prev, rows })
  }

  if (period === 'year' && year != null) {
    const monthly = monthlyDistances(summary.dailyDistance, year)
    if (monthly.some((v) => v > 0)) {
      let peak = 0
      for (let i = 1; i < 12; i++) if (monthly[i] > monthly[peak]) peak = i
      slides.push({ kind: 'months', monthly, peak, max: Math.max(...monthly) })
    }
  }

  const longest = summary.records?.longest?.activity
  if (longest?.routePoints?.length > 1) {
    const pts = privacy ? trimRoute(longest.routePoints, 300) || longest.routePoints : longest.routePoints
    slides.push({ kind: 'route', points: pts, name: longest.name, distance: longest.distance, elevation: longest.total_elevation_gain })
  }

  if (summary.totalElevation > 500) {
    slides.push({ kind: 'elevation', value: summary.totalElevation, everest: summary.totalElevation / EVEREST_M })
  }

  if (summary.activeDays > 0) {
    // heatmap réelle : la grille montre TOUS les jours, seuls les jours actifs s'allument.
    slides.push({ kind: 'streak', activeDays: summary.activeDays, streak: summary.streak, weekendShare: summary.weekendShare, heatmap })
  }

  // Poster : mosaïque des tracés de la période, placée juste après la régularité.
  const pr = posterRoutes(activities || [], { privacy, max: 140 })
  if (pr.routes.length >= 4) {
    slides.push({ kind: 'poster', routes: pr.routes, count: pr.total })
  }

  slides.push({
    kind: 'final',
    title: athleteName || 'Rewind',
    periodLabel,
    stats: {
      distance: summary.totalDistance,
      count: summary.count,
      elevation: summary.totalElevation,
      activeDays: summary.activeDays,
    },
  })

  return slides
}
