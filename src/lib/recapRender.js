// Moteur de rendu canvas du récap vidéo. Une fonction de dessin par type de slide,
// pilotée par un temps `t` (secondes). Le MÊME rendu sert à la lecture à l'écran
// (requestAnimationFrame) et à l'export vidéo (frame par frame) -> ce qu'on voit = ce qu'on exporte.

import { fmtElev, fmtInt } from './format.js'
import { normalizeRoutes } from './polyline.js'
import { monthShort } from './format.js'
import { gridLayout } from './poster.js'

const DISP = 'Space Grotesk' // wordmark / marque
const BODY = 'Inter' // labels, sous-titres
const HERO = 'Anton' // police d'affichage massive de la vidéo (chiffres, titres) — fort caractère

// durée de chaque slide (s) — rythme posé, façon story (~32 s au total pour un bilan annuel)
const DUR = { cover: 2.8, distance: 3.4, sports: 3.3, compare: 3.2, months: 3.2, route: 3.8, elevation: 3.3, streak: 3.6, poster: 3.3, final: 3.6 }

export function timeline(slides) {
  let t = 0
  const items = slides.map((slide) => {
    const dur = DUR[slide.kind] || 2.7
    const item = { slide, start: t, dur }
    t += dur
    return item
  })
  return { items, total: t }
}

// ---- helpers ----
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3)
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1, x = clamp(t); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }

function slideAlpha(localT, dur, fadeOut = true) {
  const fin = 0.32, fout = 0.28
  const a = clamp(localT / fin)
  const b = fadeOut ? clamp((dur - localT) / fout) : 1
  return Math.max(0, Math.min(a, b))
}

function text(ctx, str, x, y, o = {}) {
  const { size = 60, weight = 600, font = HERO, color = '#fff', align = 'left', alpha = 1, spacing = 0 } = o
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  ctx.font = `${weight} ${size}px "${font}"`
  if (spacing) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(str, x, y)
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function accGrad(ctx, x0, y0, x1, y1, acc) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, acc.from)
  g.addColorStop(1, acc.to)
  return g
}

// Fond de la vidéo : vient du BACKGROUND choisi par l'utilisateur (dégradé ou photo),
// PAS de l'accent. L'accent ne sert qu'à un léger halo pour lier la carte à la vidéo.
// `bg`: { stops: [hex...], image?: HTMLImageElement }
function drawBg(ctx, W, H, bg, acc, t, theme, focus) {
  // 1) photo importée -> on la dessine en "cover" + un léger scrim pour la lisibilité
  if (bg && bg.image) {
    coverImage(ctx, bg.image, W, H)
    const scr = ctx.createLinearGradient(0, 0, 0, H)
    scr.addColorStop(0, 'rgba(0,0,0,0.4)')
    scr.addColorStop(0.5, 'rgba(0,0,0,0.2)')
    scr.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = scr
    ctx.fillRect(0, 0, W, H)
    drawVignette(ctx, W, H)
    return
  }
  // 2) dégradé du fond : diagonale animée à travers ses couleurs
  const stops = (bg && bg.stops && bg.stops.length ? bg.stops : (theme === 'light' ? ['#fef6ee', '#f3e7da'] : ['#1b1f3b', '#05060f']))
  const sh = 0.06 * Math.sin(t * 0.4)
  const g = ctx.createLinearGradient(W * (0.15 + sh), 0, W * (0.85 - sh), H)
  stops.forEach((c, i) => g.addColorStop(stops.length === 1 ? 1 : i / (stops.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // léger halo d'accent (discret) pour la cohérence de marque
  const cx = W * (0.72 + 0.1 * Math.sin(t * 0.5))
  const cy = H * (0.16 + 0.05 * Math.cos(t * 0.4))
  const glow = ctx.createRadialGradient(cx, cy, 40, cx, cy, H * 0.6)
  glow.addColorStop(0, hexA(acc.from, theme === 'light' ? 0.16 : 0.22))
  glow.addColorStop(1, hexA(acc.from, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  // fil rouge : courbes de niveau topographiques qui convergent vers le point focal de la slide
  drawContours(ctx, W, H, acc, t, theme, focus)
  drawVignette(ctx, W, H)
}

// Motif unificateur : anneaux de "courbes de niveau" (carte topo) dérivant lentement.
function drawContours(ctx, W, H, acc, t, theme, focus) {
  const fx = focus?.x ?? W / 2, fy = focus?.y ?? H * 0.42
  const baseA = theme === 'light' ? 0.05 : 0.07
  ctx.save()
  ctx.lineWidth = 1.6
  for (let k = 0; k < 7; k++) {
    const r = 150 + k * 135
    ctx.strokeStyle = hexA(acc.from, baseA + (k === 2 ? 0.03 : 0))
    ctx.beginPath()
    for (let i = 0; i <= 96; i++) {
      const th = (i / 96) * Math.PI * 2
      const rr = r + 26 * Math.sin(th * 3 + k * 0.7 + t * 0.15) + 16 * Math.cos(th * 2 - t * 0.1)
      const x = fx + Math.cos(th) * rr, y = fy + Math.sin(th) * rr * 0.92
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    }
    ctx.closePath(); ctx.stroke()
  }
  ctx.restore()
}

// Vignette premium : assombrit doucement les bords pour recentrer l'œil.
function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.5, H * 0.78)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function coverImage(ctx, img, W, H) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height
  if (!iw || !ih) { ctx.fillStyle = '#0b0710'; ctx.fillRect(0, 0, W, H); return }
  const scale = Math.max(W / iw, H / ih)
  const dw = iw * scale, dh = ih * scale
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
}

function hexA(hex, a) {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// ---- slides ----
function drawCover(ctx, W, H, s, lt, acc, ink, a) {
  const e = easeOut(lt / 0.9)
  const cx = W / 2, cy = H * 0.5, R = W * 0.4
  const sweep = easeOut(clamp(lt / 1.2))
  // anneau GPS de progression (cadran de montre)
  ctx.save(); ctx.globalAlpha = a
  ctx.lineWidth = 9; ctx.strokeStyle = ink.track
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
  ctx.lineCap = 'round'; ctx.strokeStyle = accGrad(ctx, cx - R, cy - R, cx + R, cy + R, acc)
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI * 2); ctx.stroke()
  const ang = -Math.PI / 2 + sweep * Math.PI * 2
  ctx.fillStyle = '#fff'; ctx.shadowColor = acc.from; ctx.shadowBlur = 26
  ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, 9, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  // halo pulsé derrière le chiffre
  const gr = 320 * e * (1 + 0.03 * Math.sin(lt * 3))
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, gr)
  g.addColorStop(0, hexA(acc.from, 0.32)); g.addColorStop(1, hexA(acc.from, 0))
  ctx.fillStyle = g; ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2)
  ctx.restore()
  text(ctx, s.title.toUpperCase(), cx, H * 0.32, { size: 34, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a * e, spacing: 3 })
  // année/mois en gros, AJUSTÉ pour tenir dans l'anneau, style "poster" (majuscule + tracking serré)
  const label = String(s.big).toUpperCase()
  let fs = 260
  ctx.save(); ctx.font = `400 ${fs}px "${HERO}"`; ctx.letterSpacing = '1px'
  const tw = ctx.measureText(label).width; ctx.restore()
  const maxW = R * 1.55
  if (tw > maxW) fs = Math.max(80, fs * maxW / tw)
  ctx.save(); ctx.translate(cx, cy); const sc = 0.86 + 0.14 * e; ctx.scale(sc, sc)
  ctx.globalAlpha = a * e; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ink.fg; ctx.font = `400 ${fs}px "${HERO}"`; ctx.letterSpacing = '1px'
  ctx.fillText(label, 0, fs * 0.34)
  ctx.restore()
  text(ctx, s.sub, cx, H * 0.68, { size: 40, weight: 500, font: BODY, color: ink.dim, align: 'center', alpha: a * clamp((lt - 0.5) / 0.8) })
}

const EQUIV = [
  { km: 150, txt: 'un aller-retour à la mer' },
  { km: 400, txt: 'Paris → Lyon' },
  { km: 800, txt: 'Paris → Marseille aller-retour' },
  { km: 1500, txt: 'Paris → Barcelone' },
  { km: 3000, txt: 'Paris → Moscou' },
  { km: 5000, txt: 'la traversée des États-Unis' },
  { km: 8000, txt: 'Paris → New York' },
  { km: 12000, txt: 'Paris → Tokyo' },
  { km: 20000, txt: 'la moitié du tour de la Terre' },
  { km: 40075, txt: 'le tour complet de la Terre' },
]
function pickEquiv(km) {
  let best = null
  for (const e of EQUIV) if (km >= e.km) best = e
  return best
}

function drawDistance(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  text(ctx, 'TU AS PARCOURU', cx, H * 0.3, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a, spacing: 2 })
  const p = easeOut(clamp(lt / 1.5))
  const kmTotal = s.value / 1000
  const km = kmTotal * p
  const shown = km >= 100 ? fmtInt(km) : km.toFixed(1).replace('.', ',')
  text(ctx, shown, cx, H * 0.5, { size: 240, weight: 700, color: ink.fg, align: 'center', alpha: a })
  text(ctx, 'km', cx, H * 0.56, { size: 70, weight: 600, color: ink.dim, align: 'center', alpha: a })
  const bw = 420 * p
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = accGrad(ctx, cx - bw / 2, 0, cx + bw / 2, 0, acc)
  roundRect(ctx, cx - bw / 2, H * 0.585, bw, 12, 6); ctx.fill(); ctx.restore()
  text(ctx, `${fmtInt(s.count)} sorties · ${s.activeDays} jours actifs`, cx, H * 0.64, { size: 40, weight: 500, font: BODY, color: ink.dim, align: 'center', alpha: a * clamp((lt - 1.2) / 0.7) })
  // équivalence géographique : arc pointillé A -> B
  const eq = pickEquiv(kmTotal)
  if (eq) {
    const ai = a * clamp((lt - 1.3) / 0.9)
    const y0 = H * 0.75, x0 = W * 0.3, x1 = W * 0.7, mid = (x0 + x1) / 2
    ctx.save(); ctx.globalAlpha = ai
    ctx.setLineDash([6, 10]); ctx.lineDashOffset = -lt * 60
    ctx.strokeStyle = accGrad(ctx, x0, 0, x1, 0, acc); ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mid, y0 - 66, x1, y0); ctx.stroke()
    ctx.setLineDash([]); ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x0, y0, 8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x1, y0, 8, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    text(ctx, `soit ${eq.txt}`, cx, H * 0.82, { size: 44, weight: 600, font: BODY, color: ink.fg, align: 'center', alpha: a * clamp((lt - 1.7) / 0.7) })
  }
}

// Pictogrammes de sport dessinés en canvas (vectoriels -> nets et lisibles, contrairement aux emojis)
function drawSportGlyph(ctx, key, cx, cy, size, color) {
  const sc = size / 24
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(sc, sc)
  ctx.strokeStyle = color; ctx.fillStyle = color
  ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const P = () => ctx.beginPath()
  switch (key) {
    case 'ride':
      P(); ctx.arc(6, 17, 3.6, 0, Math.PI * 2); ctx.stroke()
      P(); ctx.arc(18, 17, 3.6, 0, Math.PI * 2); ctx.stroke()
      P(); ctx.moveTo(6, 17); ctx.lineTo(11, 8.5); ctx.lineTo(16.5, 8.5); ctx.lineTo(18, 17)
      ctx.moveTo(11, 8.5); ctx.lineTo(14.5, 17); ctx.moveTo(16.5, 8.5); ctx.lineTo(17.5, 6); ctx.stroke()
      break
    case 'run': case 'walk':
      P(); ctx.arc(15, 5, 2.1, 0, Math.PI * 2); ctx.fill()
      P()
      ctx.moveTo(15, 7.5); ctx.lineTo(12, 13)
      ctx.moveTo(12, 13); ctx.lineTo(8.5, 18)
      ctx.moveTo(12, 13); ctx.lineTo(16, 19)
      ctx.moveTo(13.6, 9.5); ctx.lineTo(18, 11)
      ctx.moveTo(13.6, 10); ctx.lineTo(9, 12.5)
      ctx.stroke()
      break
    case 'hike':
      P(); ctx.moveTo(3, 19); ctx.lineTo(10, 6.5); ctx.lineTo(14, 13); ctx.lineTo(16, 10); ctx.lineTo(21, 19); ctx.closePath(); ctx.stroke()
      break
    case 'swim': case 'water':
      for (const yy of [8, 13, 18]) {
        P(); ctx.moveTo(3, yy)
        ctx.quadraticCurveTo(6, yy - 2.6, 9, yy)
        ctx.quadraticCurveTo(12, yy + 2.6, 15, yy)
        ctx.quadraticCurveTo(18, yy - 2.6, 21, yy)
        ctx.stroke()
      }
      break
    case 'ski':
      for (let k = 0; k < 6; k++) { const A = (k * Math.PI) / 3; P(); ctx.moveTo(12 - Math.cos(A) * 8.5, 12 - Math.sin(A) * 8.5); ctx.lineTo(12 + Math.cos(A) * 8.5, 12 + Math.sin(A) * 8.5); ctx.stroke() }
      break
    case 'workout':
      ctx.lineWidth = 2.4
      P(); ctx.moveTo(8, 12); ctx.lineTo(16, 12); ctx.stroke()
      ctx.strokeRect(4.5, 8.5, 3, 7); ctx.strokeRect(16.5, 8.5, 3, 7)
      break
    default:
      P(); ctx.moveTo(3, 12); ctx.lineTo(8, 12); ctx.lineTo(11, 6); ctx.lineTo(14, 18); ctx.lineTo(17, 12); ctx.lineTo(21, 12); ctx.stroke()
  }
  ctx.restore()
}

function drawSports(ctx, W, H, s, lt, acc, ink, a) {
  const padX = 110
  text(ctx, 'TES SPORTS', padX, H * 0.24, { size: 40, weight: 600, font: BODY, color: ink.dim, alpha: a, spacing: 2 })
  const rows = s.sports
  const top = H * 0.33
  const rowH = 155
  const startX = padX + 100 // place pour la pastille emoji
  const barMaxW = W - padX - startX
  rows.forEach((r, i) => {
    const y = top + i * rowH
    const app = easeOut(clamp((lt - i * 0.16) / 0.9))
    const w = barMaxW * (r.distance / s.max) * app
    const cyRow = y + 40
    // pastille couleur du sport + pictogramme blanc vectoriel (lisible partout, y compris à l'export)
    ctx.save(); ctx.globalAlpha = a
    ctx.fillStyle = r.color
    ctx.beginPath(); ctx.arc(padX + 36, cyRow, 38, 0, Math.PI * 2); ctx.fill()
    drawSportGlyph(ctx, r.key, padX + 36, cyRow, 42, '#fff')
    ctx.restore()
    // piste + barre
    ctx.save(); ctx.globalAlpha = a
    ctx.fillStyle = ink.track; roundRect(ctx, startX, y + 46, barMaxW, 26, 13); ctx.fill()
    const g = ctx.createLinearGradient(startX, 0, startX + Math.max(w, 1), 0)
    g.addColorStop(0, r.color); g.addColorStop(1, r.color + 'cc')
    ctx.fillStyle = g; roundRect(ctx, startX, y + 46, Math.max(w, 6), 26, 13); ctx.fill()
    ctx.restore()
    text(ctx, r.label, startX, y + 30, { size: 46, weight: 600, color: ink.fg, alpha: a })
    text(ctx, `${(r.distance / 1000).toFixed(0)} km`, W - padX, y + 30, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'right', alpha: a * app })
  })
}

function drawMonths(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  text(ctx, 'TON PLUS GROS MOIS', cx, H * 0.24, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a, spacing: 2 })
  const peakName = monthName(s.peak)
  text(ctx, peakName, cx, H * 0.34, { size: 120, weight: 700, color: ink.fg, align: 'center', alpha: a * clamp((lt - 0.4) / 0.8) })
  const padX = 110
  const gw = W - padX * 2
  const gap = 14
  const bw = (gw - gap * 11) / 12
  const base = H * 0.74
  const maxH = H * 0.28
  for (let i = 0; i < 12; i++) {
    const app = easeOut(clamp((lt - 0.2 - i * 0.05) / 0.8))
    const h = (s.max ? (s.monthly[i] / s.max) : 0) * maxH * app
    const x = padX + i * (bw + gap)
    ctx.save(); ctx.globalAlpha = a
    ctx.fillStyle = i === s.peak ? accGrad(ctx, x, base - h, x, base, acc) : ink.track
    roundRect(ctx, x, base - h, bw, Math.max(h, 4), 6); ctx.fill()
    ctx.restore()
  }
}

function drawRoute(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  text(ctx, 'TA SORTIE LÉGENDAIRE', cx, H * 0.2, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a, spacing: 2 })
  const size = Math.min(W - 220, H * 0.42)
  const ox = cx - size / 2
  const oy = H * 0.26
  const norm = normalizeRoutes([s.points], size, size, size * 0.1)[0]
  if (norm && norm.length > 1) {
    const frac = easeInOut(clamp(lt / 2.2))
    const n = Math.max(2, Math.floor(norm.length * frac))
    ctx.save(); ctx.globalAlpha = a
    ctx.strokeStyle = accGrad(ctx, ox, oy, ox + size, oy + size, acc)
    ctx.lineWidth = Math.max(4, size * 0.009)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const [px, py] = norm[i]
      if (i === 0) ctx.moveTo(ox + px, oy + py)
      else ctx.lineTo(ox + px, oy + py)
    }
    ctx.stroke()
    // point de tête
    const head = norm[n - 1]
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(ox + head[0], oy + head[1], Math.max(5, size * 0.013), 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  const info = clamp((lt - 1.6) / 0.8)
  if (s.name) text(ctx, truncate(s.name, 24), cx, H * 0.78, { size: 52, weight: 700, color: ink.fg, align: 'center', alpha: a * info })
  const km = (s.distance / 1000).toFixed(1).replace('.', ',')
  text(ctx, `${km} km · ${fmtElev(s.elevation)} m D+`, cx, H * 0.84, { size: 42, weight: 500, font: BODY, color: ink.dim, align: 'center', alpha: a * info })
}

function drawElevation(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  // montagne qui se remplit
  const p = easeOut(clamp(lt / 1.6))
  const mtnTop = H * 0.42, mtnBase = H * 0.72, mtnHalf = W * 0.26
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx, mtnTop); ctx.lineTo(cx + mtnHalf, mtnBase); ctx.lineTo(cx - mtnHalf, mtnBase); ctx.closePath()
  ctx.clip()
  ctx.globalAlpha = a
  const fillTop = mtnBase - (mtnBase - mtnTop) * p
  ctx.fillStyle = accGrad(ctx, cx, mtnBase, cx, mtnTop, acc)
  ctx.fillRect(cx - mtnHalf, fillTop, mtnHalf * 2, mtnBase - fillTop)
  ctx.fillStyle = ink.track
  ctx.fillRect(cx - mtnHalf, mtnTop, mtnHalf * 2, fillTop - mtnTop)
  ctx.restore()
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = hexA('#ffffff', 0.25); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(cx, mtnTop); ctx.lineTo(cx + mtnHalf, mtnBase); ctx.lineTo(cx - mtnHalf, mtnBase); ctx.closePath(); ctx.stroke(); ctx.restore()

  text(ctx, 'TU AS GRIMPÉ', cx, H * 0.2, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a, spacing: 2 })
  const shown = fmtInt(s.value * p)
  text(ctx, `${shown} m`, cx, H * 0.32, { size: 130, weight: 700, color: ink.fg, align: 'center', alpha: a })

  // rangée de mini-Everest qui s'allument (on visualise le ×N)
  const full = Math.floor(s.everest)
  const total = Math.min(full, 12)
  if (total >= 1) {
    const tw = 40, th = 50, gap = 14
    const rowW = total * tw + (total - 1) * gap
    const sx = cx - rowW / 2, sy = H * 0.86
    const lit = full * easeOut(clamp((lt - 0.6) / 1.4))
    ctx.save(); ctx.globalAlpha = a
    for (let i = 0; i < total; i++) {
      const x = sx + i * (tw + gap)
      ctx.beginPath(); ctx.moveTo(x + tw / 2, sy - th); ctx.lineTo(x + tw, sy); ctx.lineTo(x, sy); ctx.closePath()
      if (i < lit) { ctx.fillStyle = accGrad(ctx, x, sy - th, x, sy, acc); ctx.fill() }
      else { ctx.strokeStyle = ink.track; ctx.lineWidth = 2.5; ctx.stroke() }
    }
    ctx.restore()
  }
  text(ctx, `soit l'Everest ×${s.everest.toFixed(1).replace('.', ',')}`, cx, H * 0.93, { size: 46, weight: 600, font: BODY, color: ink.fg, align: 'center', alpha: a * clamp((lt - 1.2) / 0.8) })
}

function drawStreak(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  text(ctx, 'TA RÉGULARITÉ', cx, H * 0.15, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a, spacing: 2 })

  const hm = s.heatmap
  const isYear = hm && hm.type === 'year'
  const groups = hm ? (isYear ? hm.columns : hm.weeks) : null
  const cols = isYear ? (groups ? groups.length : 0) : 7
  const rows = isYear ? 7 : (groups ? groups.length : 0)
  const flat = []
  let totalDays = 0
  if (groups) groups.forEach((g, gi) => g.forEach((c, di) => {
    if (c) totalDays++
    flat.push({ cell: c, x: isYear ? gi : di, y: isYear ? di : gi })
  }))

  // Anneau de complétude autour du nombre
  const ringCy = H * 0.3, R = 168
  const comp = totalDays ? clamp(s.activeDays / totalDays) : 0
  const pr = easeOut(clamp(lt / 1.6))
  ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 22; ctx.lineCap = 'round'
  ctx.strokeStyle = ink.track; ctx.beginPath(); ctx.arc(cx, ringCy, R, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = accGrad(ctx, cx - R, ringCy - R, cx + R, ringCy + R, acc)
  ctx.beginPath(); ctx.arc(cx, ringCy, R, -Math.PI / 2, -Math.PI / 2 + comp * pr * Math.PI * 2); ctx.stroke()
  ctx.restore()
  text(ctx, `${Math.round(s.activeDays * pr)}`, cx, ringCy + 34, { size: 132, weight: 700, color: ink.fg, align: 'center', alpha: a })
  text(ctx, 'jours actifs', cx, ringCy + 92, { size: 36, weight: 500, font: BODY, color: ink.dim, align: 'center', alpha: a })
  if (totalDays) text(ctx, `${Math.round(comp * pr * 100)} % ${isYear ? "de l'année" : 'du mois'}`, cx, H * 0.5, { size: 44, weight: 600, font: BODY, color: ink.fg, align: 'center', alpha: a * clamp((lt - 0.8) / 0.7) })

  // Heatmap véridique, révélée en vague diagonale
  if (groups && groups.length) {
    const areaW = W - 200, areaTop = H * 0.55, areaH = H * 0.28
    const gap = isYear ? 4 : 12
    const cell = Math.min((areaW - gap * (cols - 1)) / cols, (areaH - gap * (rows - 1)) / rows)
    const gw = cols * cell + (cols - 1) * gap, gh = rows * cell + (rows - 1) * gap
    const ox = cx - gw / 2, oy = areaTop + (areaH - gh) / 2
    const front = easeOut(clamp((lt - 0.4) / 1.8))
    ctx.save(); ctx.globalAlpha = a
    flat.forEach((f) => {
      if (!f.cell) return
      const phase = (f.x + f.y) / (cols + rows)
      const wave = clamp((front - phase) / 0.12)
      const active = f.cell.value > 0
      const px = ox + f.x * (cell + gap), py = oy + f.y * (cell + gap)
      const pop = 1 + 0.35 * wave * (1 - wave) * 4
      const cs = cell * (active ? pop : 1)
      const off = (cs - cell) / 2
      ctx.fillStyle = active ? mix(ink.track, acc.from, wave) : ink.track
      roundRect(ctx, px - off, py - off, cs, cs, cs * 0.26); ctx.fill()
    })
    ctx.restore()
  }
  if (s.streak >= 2) text(ctx, `🔥 plus longue série : ${s.streak} jours`, cx, H * 0.92, { size: 44, weight: 600, font: BODY, color: ink.fg, align: 'center', alpha: a * clamp((lt - 1.6) / 0.7) })
}

// mélange deux couleurs (rgba/hex) selon t — pour l'interpolation piste -> accent
function mix(c1, c2, t) {
  const p = (c) => {
    if (c.startsWith('rgba')) { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1] }
    const h = c.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]
  }
  const A = p(c1), B = p(c2), k = clamp(t)
  const r = Math.round(A[0] + (B[0] - A[0]) * k), g = Math.round(A[1] + (B[1] - A[1]) * k), b = Math.round(A[2] + (B[2] - A[2]) * k)
  const al = A[3] + (B[3] - A[3]) * k
  return `rgba(${r},${g},${b},${al})`
}

function drawCompare(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  const up = s.pct >= 0
  text(ctx, up ? 'TU AS ACCÉLÉRÉ' : 'TU AS LEVÉ LE PIED', cx, H * 0.28, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a, spacing: 2 })
  const p = easeOut(clamp(lt / 1.3))
  // au-delà de +400 % (on repart de ~zéro) on affiche un multiplicateur "×N,N", bien plus parlant
  const huge = s.prev > 0 && s.pct >= 400
  let label
  if (huge) {
    const m = (s.cur / s.prev) * p
    label = `×${m.toFixed(1).replace('.', ',')}`
  } else {
    label = `${up ? '+' : ''}${Math.round(s.pct * p)}%`
  }
  const col = up ? '#34d399' : '#f87171'
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'
  ctx.fillStyle = ink.fg; ctx.font = `400 210px "${HERO}"`
  ctx.fillText(label, cx, H * 0.5)
  ctx.restore()
  // triangle directionnel
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col
  const ax = cx, ay = H * 0.56, aw = 46
  ctx.beginPath()
  if (up) { ctx.moveTo(ax, ay - aw); ctx.lineTo(ax + aw, ay); ctx.lineTo(ax - aw, ay) }
  else { ctx.moveTo(ax, ay + aw); ctx.lineTo(ax + aw, ay); ctx.lineTo(ax - aw, ay) }
  ctx.closePath(); ctx.fill(); ctx.restore()
  text(ctx, `de distance vs ${s.label}`, cx, H * 0.63, { size: 44, weight: 500, font: BODY, color: ink.dim, align: 'center', alpha: a * clamp((lt - 0.6) / 0.7) })
  // top écarts par sport
  const rows = s.rows || []
  rows.forEach((r, i) => {
    const y = H * 0.72 + i * 78
    const ap = a * clamp((lt - 1 - i * 0.15) / 0.7)
    const rup = r.delta >= 0
    text(ctx, r.label, cx - 220, y, { size: 40, weight: 600, color: ink.fg, align: 'left', alpha: ap })
    text(ctx, `${rup ? '▲ +' : '▼ '}${(Math.abs(r.delta) / 1000).toFixed(1).replace('.', ',')} km`, cx + 220, y, { size: 40, weight: 600, font: BODY, color: rup ? '#34d399' : '#f87171', align: 'right', alpha: ap })
  })
}

function drawPoster(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  text(ctx, 'TOUS TES TRACÉS', cx, H * 0.16, { size: 40, weight: 600, font: BODY, color: ink.dim, align: 'center', alpha: a, spacing: 2 })
  const routes = s.routes || []
  const areaW = W - 160, areaTop = H * 0.22, areaH = H * 0.62
  const gap = 10
  const { cols, rows, size } = gridLayout(routes.length, areaW, areaH, gap)
  const gw = cols * size + (cols - 1) * gap
  const gh = rows * size + (rows - 1) * gap
  const ox = cx - gw / 2, oy = areaTop + (areaH - gh) / 2
  // révélation RÉGULIÈRE (linéaire) et terminée tôt -> pas de dernière vignette à la traîne,
  // puis la mosaïque complète tient à l'écran le reste de la slide.
  const reveal = clamp((lt - 0.15) / 1.5)
  const shown = Math.floor(routes.length * reveal)
  ctx.save(); ctx.globalAlpha = a
  routes.forEach((r, i) => {
    if (i >= shown) return
    const col = i % cols, row = Math.floor(i / cols)
    const x = ox + col * (size + gap), y = oy + row * (size + gap)
    // tuile
    ctx.fillStyle = ink.track
    roundRect(ctx, x, y, size, size, size * 0.16); ctx.fill()
    // tracé
    const norm = normalizeRoutes([r.points], size, size, size * 0.2)[0]
    if (norm && norm.length > 1) {
      ctx.strokeStyle = r.color
      ctx.lineWidth = Math.max(1, size * 0.038)
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.beginPath()
      norm.forEach((p, k) => (k === 0 ? ctx.moveTo(x + p[0], y + p[1]) : ctx.lineTo(x + p[0], y + p[1])))
      ctx.stroke()
    }
  })
  ctx.restore()
  text(ctx, `${fmtInt(s.count || routes.length)} sorties, une seule image`, cx, H * 0.9, { size: 42, weight: 500, font: BODY, color: ink.dim, align: 'center', alpha: a * clamp((lt - 1.4) / 0.7) })
}

function drawFinal(ctx, W, H, s, lt, acc, ink, a) {
  const cx = W / 2
  text(ctx, s.periodLabel, cx, H * 0.2, { size: 120, weight: 700, color: ink.fg, align: 'center', alpha: a })
  const stats = [
    [(s.stats.distance / 1000) >= 100 ? fmtInt(s.stats.distance / 1000) : (s.stats.distance / 1000).toFixed(1).replace('.', ','), 'km'],
    [fmtInt(s.stats.count), 'sorties'],
    [fmtElev(s.stats.elevation), 'm D+'],
    [String(s.stats.activeDays), 'jours actifs'],
  ]
  stats.forEach((st, i) => {
    const y = H * 0.34 + i * H * 0.115
    const raw = clamp((lt - 0.3 - i * 0.18) / 0.6)
    const ap = easeOutBack(raw)
    const dir = i % 2 ? 1 : -1
    const ox = dir * (1 - clamp(raw)) * 130
    ctx.save(); ctx.globalAlpha = a * clamp(raw / 0.4); ctx.translate(ox, 0); ctx.textAlign = 'center'
    ctx.fillStyle = ink.fg; ctx.font = `400 96px "${HERO}"`
    ctx.fillText(st[0], cx - 40, y)
    ctx.fillStyle = ink.dim; ctx.font = `500 44px "${BODY}"`
    ctx.textAlign = 'left'
    ctx.fillText(' ' + st[1], cx + measure(ctx, st[0], 96, HERO) / 2 - 40, y)
    ctx.restore()
    // trait signature accent sous la stat
    const uw = 240 * clamp((lt - 0.45 - i * 0.18) / 0.6)
    if (uw > 2) {
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = accGrad(ctx, cx - uw / 2 + ox, 0, cx + uw / 2 + ox, 0, acc)
      roundRect(ctx, cx - uw / 2 + ox, y + 18, uw, 5, 3); ctx.fill(); ctx.restore()
    }
  })
  const bp = clamp((lt - 1.4) / 0.8)
  text(ctx, 'Crée le tien avec', cx, H * 0.88, { size: 40, weight: 500, font: BODY, color: ink.dim, align: 'center', alpha: a * bp })
  ctx.save(); ctx.globalAlpha = a * bp; ctx.textAlign = 'center'
  ctx.font = `700 64px "${DISP}"`; ctx.fillStyle = ink.fg
  ctx.fillText('re', cx - measure(ctx, 'wind', 64, DISP) / 2 - 4, H * 0.93)
  ctx.fillStyle = acc.from
  ctx.fillText('wind', cx + measure(ctx, 're', 64, DISP) / 2 + 4, H * 0.93)
  ctx.restore()
}

function measure(ctx, str, size, font) {
  ctx.save(); ctx.font = `700 ${size}px "${font}"`; const w = ctx.measureText(str).width; ctx.restore(); return w
}
function truncate(str, n) { return str.length > n ? str.slice(0, n - 1) + '…' : str }
function monthName(m) {
  const M = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  return M[m] || monthShort(m)
}

const DRAW = {
  cover: drawCover, distance: drawDistance, sports: drawSports, compare: drawCompare, months: drawMonths,
  route: drawRoute, elevation: drawElevation, streak: drawStreak, poster: drawPoster, final: drawFinal,
}

// Dessine la frame au temps `t`. `opts`: { W, H, acc, theme, bg }.
export function drawFrame(ctx, tl, t, opts) {
  const { W, H, acc, theme = 'dark', bg = null } = opts
  const ink = theme === 'light'
    ? { fg: '#14141a', dim: 'rgba(20,20,28,0.6)', track: 'rgba(0,0,0,0.08)' }
    : { fg: '#ffffff', dim: 'rgba(255,255,255,0.7)', track: 'rgba(255,255,255,0.12)' }
  const tt = clamp(t, 0, tl.total - 0.001)
  let idx = tl.items.findIndex((it) => tt >= it.start && tt < it.start + it.dur)
  if (idx === -1) idx = tl.items.length - 1
  const item = tl.items[idx]
  const isLast = idx === tl.items.length - 1
  const lt = tt - item.start
  // le fond (et ses courbes de niveau) converge vers le "point chaud" de la slide
  const FOCUS_Y = { cover: 0.5, distance: 0.5, sports: 0.4, compare: 0.46, months: 0.44, route: 0.42, elevation: 0.44, streak: 0.32, poster: 0.5, final: 0.5 }
  drawBg(ctx, W, H, bg, acc, t, theme, { x: W / 2, y: (FOCUS_Y[item.slide.kind] ?? 0.42) * H })
  const a = slideAlpha(lt, item.dur, !isLast) // la dernière slide ne se fond pas en sortie
  const fn = DRAW[item.slide.kind]
  if (fn) fn(ctx, W, H, item.slide, lt, acc, ink, a)
}
