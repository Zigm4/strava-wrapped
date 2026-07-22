// Lien Wrapped partageable : SANS serveur ni base de données.
// On sérialise un instantané compact de la carte, on le compresse (lz-string) et on le met
// dans le FRAGMENT d'URL (#w=...) : le fragment n'est jamais envoyé au serveur, donc la
// promesse "rien ne quitte ton navigateur" reste vraie. Le destinataire ouvre le lien et
// voit la carte, rendue en local à partir de ces données.

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

const round = (n) => Math.round(n || 0)
const r3 = (n) => +(n || 0).toFixed(3)

// Décime un tracé à ~maxPts points, coords arrondies à 4 décimales (~11 m).
function slimRoute(route, maxPts = 80) {
  if (!route || route.length < 2) return null
  const step = Math.max(1, Math.ceil(route.length / maxPts))
  const out = []
  for (let i = 0; i < route.length; i += step) out.push([+route[i][0].toFixed(4), +route[i][1].toFixed(4)])
  const last = route[route.length - 1]
  const lr = [+last[0].toFixed(4), +last[1].toFixed(4)]
  const tail = out[out.length - 1]
  if (tail[0] !== lr[0] || tail[1] !== lr[1]) out.push(lr)
  return out
}

// Instantané compact des props de StoryCard (clés courtes pour réduire l'URL).
export function buildSnapshot(p) {
  const s = p.summary
  const rec = s.records || {}
  return {
    v: 1,
    su: {
      count: s.count, totalDistance: round(s.totalDistance), activeDays: s.activeDays,
      totalElevation: round(s.totalElevation), totalMovingTime: round(s.totalMovingTime),
      achievements: s.achievements, kudos: s.kudos, streak: s.streak,
      weekendShare: r3(s.weekendShare), dayPart: s.dayPart, dominantFamily: s.dominantFamily,
      byType: (s.byType || []).map((t) => ({ key: t.key, label: t.label, color: t.color, distance: round(t.distance), count: t.count, elevation: round(t.elevation), time: round(t.time) })),
      records: {
        longest: rec.longest && { distance: round(rec.longest.distance) },
        biggestClimb: rec.biggestClimb && { elevation: round(rec.biggestClimb.elevation) },
        bestRun: rec.bestRun && { speed: r3(rec.bestRun.speed) },
        bestRide: rec.bestRide && { speed: r3(rec.bestRide.speed) },
        longestTime: rec.longestTime && { time: round(rec.longestTime.time) },
        topDay: rec.topDay && { day: rec.topDay.day, distance: round(rec.topDay.distance) },
      },
      races: (s.races || []).map((r) => ({ name: r.name, family: r.family, distance: round(r.distance), time: round(r.time), speed: r3(r.speed), isRecord: !!r.isRecord })),
      heroRoute: slimRoute(s.heroRoute),
    },
    f: p.formatId, bg: p.bgId, ac: p.accentId, th: p.theme, sc: +(p.scrim ?? 0.5).toFixed(2),
    pl: p.periodLabel, ti: p.title, ha: p.handle, pv: p.privacy ? 1 : 0,
    sp: p.spot ? { name: p.spot.name, region: p.spot.region, type: p.spot.type, count: p.spot.count, distance: round(p.spot.distance), elevation: round(p.spot.elevation) } : null,
    cmp: p.comparison ? {
      pct: p.comparison.pct, label: p.comparison.label,
      ip: p.comparison.inProgress ? 1 : 0, ao: p.comparison.asOf || null,
      pr: p.comparison.progress ? { r: round(p.comparison.progress.remaining), p: +(p.comparison.progress.pct || 0).toFixed(3) } : null,
    } : null,
    tc: p.showDeltas && p.typeCompare
      ? { label: p.typeCompare.label, rows: p.typeCompare.rows.map((r) => ({ key: r.key, label: r.label, color: r.color, current: round(r.current), previous: round(r.previous), delta: round(r.delta), deltaElev: round(r.deltaElev) })) }
      : null,
  }
}

// Reconstruit les props de StoryCard à partir d'un instantané. bg/accent sont retrouvés par id.
export function hydrateSnapshot(snap, backgrounds, accents) {
  if (!snap || !snap.su) return null
  const bg = backgrounds.find((b) => b.id === snap.bg) || backgrounds[0]
  const accent = accents.find((a) => a.id === snap.ac) || accents[0]
  const summary = { ...snap.su, favoriteSpot: null }
  return {
    summary,
    formatId: snap.f, background: bg, accent, theme: snap.th, scrim: snap.sc,
    periodLabel: snap.pl, title: snap.ti, handle: snap.ha, privacy: !!snap.pv,
    spot: snap.sp,
    comparison: snap.cmp ? {
      pct: snap.cmp.pct, label: snap.cmp.label,
      inProgress: !!snap.cmp.ip, asOf: snap.cmp.ao || null,
      progress: snap.cmp.pr ? { remaining: snap.cmp.pr.r, pct: snap.cmp.pr.p } : null,
    } : null,
    showDeltas: !!snap.tc, typeCompare: snap.tc || { rows: [], label: '' },
    showHeatmap: false, heatmap: null,
  }
}

export function encodeShare(snapshot) {
  return compressToEncodedURIComponent(JSON.stringify(snapshot))
}

export function decodeShare(str) {
  try {
    const j = decompressFromEncodedURIComponent(str)
    return j ? JSON.parse(j) : null
  } catch {
    return null
  }
}

export function shareUrl(snapshot) {
  return `${location.origin}${location.pathname}#w=${encodeShare(snapshot)}`
}

// Lit un instantané depuis le fragment #w=... (ou null).
export function readShareHash() {
  const h = (typeof window !== 'undefined' && window.location.hash) || ''
  const m = h.match(/[#&]w=([^&]+)/)
  return m ? decodeShare(m[1]) : null
}
