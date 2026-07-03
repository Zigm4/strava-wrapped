// Sélection de CONTENU de la carte (quoi montrer), séparée du rendu JSX.
// Retourne des données prêtes à afficher (avec la référence d'icône Lucide).

import { Mountain, Timer, Gauge, CalendarDays, Route, TrendingUp, TrendingDown, Sunrise, Sun, Sunset, Moon, Flame } from 'lucide-react'
import { fmtKm, fmtElev, fmtPace, fmtSpeed, fmtDuration, fmtCompare } from './format.js'

// Densité de contenu par format (combien d'éléments, quels blocs).
export const DENSITY = {
  story: { types: 4, records: 4, races: 3, highlights: 3, showTypes: true, showRecords: true, showMap: true, mapH: 280 },
  portrait: { types: 3, records: 0, races: 1, highlights: 0, showTypes: true, showRecords: false, showMap: true, mapH: 176 },
  square: { types: 3, records: 0, races: 0, highlights: 0, showTypes: true, showRecords: false, showMap: false, mapH: 0 },
}

const DAY_PART = {
  matin: { icon: Sunrise, label: 'Plutôt le matin' },
  midi: { icon: Sun, label: 'Plutôt le midi' },
  'après-midi': { icon: Sun, label: "Plutôt l'après-midi" },
  soir: { icon: Sunset, label: 'Plutôt le soir' },
  nuit: { icon: Moon, label: 'Plutôt la nuit' },
}

export function buildHighlights(summary, comparison, max) {
  const out = []
  if (comparison) {
    const up = comparison.pct >= 0
    out.push({ icon: up ? TrendingUp : TrendingDown, text: `${fmtCompare(comparison)} vs ${comparison.label}` })
  }
  if (summary.dayPart && DAY_PART[summary.dayPart]) out.push({ icon: DAY_PART[summary.dayPart].icon, text: DAY_PART[summary.dayPart].label })
  if (summary.weekendShare != null) out.push({ icon: CalendarDays, text: `${Math.round(summary.weekendShare * 100)}% le week-end` })
  if (summary.streak >= 3) out.push({ icon: Flame, text: `Série de ${summary.streak} j` })
  return out.slice(0, max)
}

export function buildRecords(summary, max) {
  const r = summary.records
  const out = []
  if (r.longest) out.push({ icon: Route, label: 'Plus longue sortie', value: `${fmtKm(r.longest.distance)}`, unit: 'km' })
  if (r.biggestClimb && r.biggestClimb.elevation > 50)
    out.push({ icon: Mountain, label: 'Plus grosse montée', value: `${fmtElev(r.biggestClimb.elevation)}`, unit: 'm D+' })
  const dom = summary.dominantFamily
  if (dom === 'ride' && r.bestRide) out.push({ icon: Gauge, label: 'Meilleure vitesse', value: fmtSpeed(r.bestRide.speed), unit: 'km/h' })
  else if (r.bestRun) out.push({ icon: Gauge, label: 'Meilleure allure', value: fmtPace(r.bestRun.speed), unit: '/km' })
  else if (r.bestRide) out.push({ icon: Gauge, label: 'Meilleure vitesse', value: fmtSpeed(r.bestRide.speed), unit: 'km/h' })
  if (r.longestTime) out.push({ icon: Timer, label: 'Plus longue durée', value: fmtDuration(r.longestTime.time), unit: '' })
  if (r.topDay) out.push({ icon: CalendarDays, label: `Top jour · ${r.topDay.day}`, value: `${fmtKm(r.topDay.distance)}`, unit: 'km' })
  return out.slice(0, max)
}

// écart de distance (mètres) : "▲ +12,3 km" / "▼ -5,0 km" / "≈ 0 km"
export function deltaText(d) {
  if (Math.abs(d) < 100) return '≈ 0 km'
  return `${d > 0 ? '▲ +' : '▼ -'}${fmtKm(Math.abs(d))} km`
}

// écart de dénivelé positif : "▲ +340 m D+" / "▼ -120 m D+" / "≈ 0 m D+"
export function deltaElevText(d) {
  if (Math.abs(d) < 10) return '≈ 0 m D+'
  return `${d > 0 ? '▲ +' : '▼ -'}${fmtElev(Math.abs(d))} m D+`
}
