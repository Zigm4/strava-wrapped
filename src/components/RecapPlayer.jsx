import { useEffect, useMemo, useRef, useState } from 'react'
import { X, RotateCcw, Film, Download, Images, Check } from 'lucide-react'
import { timeline, drawFrame } from '../lib/recapRender.js'
import { exportRecapVideo, videoSupport } from '../lib/videoExport.js'
import { bgCanvasColors } from '../data/backgrounds.js'
import { saveOrShare } from '../lib/save.js'

// Instant "posé" d'une slide (entrée finie, avant la transition de sortie) -> export propre.
const settleT = (it) => it.start + it.dur - 0.5

const W = 1080, H = 1920
const HOLD_MS = 160 // au-delà, un appui maintenu = pause (façon Stories) ; en deçà = tap = navigation

// Lecteur plein écran du récap : lecture fluide sur canvas (rAF) + export vidéo.
// La boucle rAF NE TOURNE QUE pendant la lecture : en pause / fin de vidéo elle s'arrête
// complètement (un seul dessin figé) — sinon le canvas se redessinerait à 60 fps sans fin
// et ferait chauffer l'appareil.
export default function RecapPlayer({ slides, acc, theme = 'dark', background, photo, periodLabel, onClose }) {
  const tl = useMemo(() => timeline(slides), [slides])
  const bgStops = useMemo(() => bgCanvasColors(background?.css), [background])
  const photoRef = useRef(null)
  const canvasRef = useRef(null)
  const barsRef = useRef([])

  // précharge la photo importée (si c'est le fond) pour la dessiner dans la vidéo
  useEffect(() => {
    photoRef.current = null
    if (!photo) return
    const img = new Image()
    img.onload = () => { photoRef.current = img; ctrlRef.current?.draw() }
    img.src = photo
  }, [photo])

  const tRef = useRef(0)      // temps courant affiché (s)
  const baseRef = useRef(0)   // temps accumulé au début du segment de lecture
  const startRef = useRef(0)  // performance.now() au début du segment
  const playingRef = useRef(true)
  const rafRef = useRef(0)
  const aliveRef = useRef(false) // partagé (résiste au double-montage StrictMode en dev)
  const ctrlRef = useRef(null) // { startLoop, stopLoop, draw } fournis par l'effet de rendu
  const holdRef = useRef({ timer: 0, held: false, x: 0 })
  const exportingRef = useRef(false) // lu par le handler clavier (deps [], donc l'état serait périmé)

  const [ended, setEnded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pct, setPct] = useState(0)
  const [toast, setToast] = useState(null)
  const [gallery, setGallery] = useState(false) // galerie d'export des slides
  const [sel, setSel] = useState(() => new Set()) // indices de slides sélectionnés
  const thumbRefs = useRef([])
  const offRef = useRef(null) // canvas 1080x1920 hors-écran (rendu des vignettes/export)
  const support = useMemo(() => videoSupport(), [])

  const renderOpts = () => ({ W, H, acc, theme, bg: { stops: bgStops, image: photoRef.current } })
  const getOff = () => {
    if (!offRef.current) { const c = document.createElement('canvas'); c.width = W; c.height = H; offRef.current = c }
    return offRef.current
  }

  // rend les vignettes quand la galerie s'ouvre (slide à son état "posé")
  useEffect(() => {
    if (!gallery) return
    const off = getOff(); const octx = off.getContext('2d')
    tl.items.forEach((it, i) => {
      const cv = thumbRefs.current[i]; if (!cv) return
      drawFrame(octx, tl, settleT(it), renderOpts())
      const tctx = cv.getContext('2d'); tctx.clearRect(0, 0, cv.width, cv.height)
      tctx.drawImage(off, 0, 0, cv.width, cv.height)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery, tl])

  const toggleSel = (i) => setSel((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  const allSelected = sel.size === tl.items.length
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(tl.items.map((_, i) => i)))

  async function exportSlides() {
    if (exporting || !sel.size) return
    setExporting(true); exportingRef.current = true
    try {
      const off = getOff(); const octx = off.getContext('2d')
      const indices = [...sel].sort((x, y) => x - y)
      const files = []
      for (const i of indices) {
        drawFrame(octx, tl, settleT(tl.items[i]), renderOpts())
        const blob = await new Promise((r) => off.toBlob(r, 'image/png'))
        if (blob) files.push(new File([blob], `rewind-slide-${i + 1}.png`, { type: 'image/png' }))
      }
      if (!files.length) throw new Error('empty')
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: 'Mes slides Rewind' })
        setToast(`${files.length} slide${files.length > 1 ? 's' : ''} partagée${files.length > 1 ? 's' : ''} 🖼️`)
      } else {
        for (const f of files) {
          const u = URL.createObjectURL(f); const link = document.createElement('a')
          link.href = u; link.download = f.name; link.click()
          setTimeout(() => URL.revokeObjectURL(u), 8000)
        }
        setToast(`${files.length} image${files.length > 1 ? 's' : ''} téléchargée${files.length > 1 ? 's' : ''} 🖼️`)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') { console.error(err); setToast("L'export des slides a échoué.") }
    } finally {
      setExporting(false); exportingRef.current = false
    }
  }

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    aliveRef.current = true
    let cancelled = false // garde l'auto-démarrage de CET effet (StrictMode)
    const updateBars = () => {
      tl.items.forEach((it, i) => {
        const el = barsRef.current[i]
        if (el) el.style.width = `${Math.max(0, Math.min(1, (tRef.current - it.start) / it.dur)) * 100}%`
      })
    }
    const draw = () => {
      drawFrame(ctx, tl, tRef.current, { W, H, acc, theme, bg: { stops: bgStops, image: photoRef.current } })
      updateBars()
    }
    const tick = (now) => {
      if (!aliveRef.current) return
      tRef.current = baseRef.current + (now - startRef.current) / 1000
      if (tRef.current >= tl.total) {
        tRef.current = tl.total; playingRef.current = false
        draw(); setEnded(true)
        return // fin : on arrête la boucle (plus aucun dessin -> plus de chauffe)
      }
      draw()
      rafRef.current = requestAnimationFrame(tick)
    }
    const startLoop = () => {
      cancelAnimationFrame(rafRef.current)
      aliveRef.current = true
      playingRef.current = true
      baseRef.current = tRef.current
      startRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
    }
    const stopLoop = () => {
      cancelAnimationFrame(rafRef.current)
      playingRef.current = false
      baseRef.current = tRef.current
      draw() // fige la frame courante, puis plus rien
    }
    ctrlRef.current = { startLoop, stopLoop, draw }

    const fonts = document.fonts
    const ready = fonts?.load
      ? Promise.all([
          fonts.load('400 200px "Anton"'),
          fonts.load('700 100px "Space Grotesk"'),
          fonts.load('600 40px "Inter"'),
        ]).catch(() => {})
      : Promise.resolve()
    ready.then(() => { if (cancelled) return; draw(); if (playingRef.current && !exporting) startLoop() })
    return () => { cancelled = true; aliveRef.current = false; cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tl, acc, theme, bgStops])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (exportingRef.current) return // pas d'interaction pendant l'export (comme les gestes)
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') { e.preventDefault(); togglePause() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function currentIndex() {
    const t = tRef.current
    const i = tl.items.findIndex((it) => t >= it.start && t < it.start + it.dur)
    return i === -1 ? tl.items.length - 1 : i
  }
  function go(dir) {
    const i = currentIndex()
    const ni = Math.max(0, Math.min(tl.items.length - 1, i + dir))
    tRef.current = tl.items[ni].start + 0.001
    setEnded(false)
    ctrlRef.current?.startLoop()
  }
  function togglePause() {
    if (ended) { tRef.current = 0; setEnded(false); ctrlRef.current?.startLoop(); return }
    if (playingRef.current) ctrlRef.current?.stopLoop()
    else ctrlRef.current?.startLoop()
  }
  function replay() { tRef.current = 0; setEnded(false); ctrlRef.current?.startLoop() }

  // Gestes façon Stories : appui maintenu = pause (sans overlay), tap gauche/droite = naviguer.
  function onPointerDown(e) {
    if (exporting) return
    const rect = e.currentTarget.getBoundingClientRect()
    holdRef.current.x = (e.clientX - rect.left) / rect.width
    holdRef.current.held = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
    holdRef.current.timer = setTimeout(() => {
      holdRef.current.held = true
      if (playingRef.current) ctrlRef.current?.stopLoop() // pause silencieuse
    }, HOLD_MS)
  }
  function endHold(navigate) {
    clearTimeout(holdRef.current.timer)
    if (holdRef.current.held) {
      holdRef.current.held = false
      if (!ended) ctrlRef.current?.startLoop() // relâche -> reprend
    } else if (navigate) {
      go(holdRef.current.x < 0.33 ? -1 : 1)
    }
  }
  function onPointerUp() { if (!exporting) endHold(true) }
  function onPointerCancel() { if (!exporting) endHold(false) }

  async function handleExport() {
    if (exporting) return
    setExporting(true); exportingRef.current = true; setPct(0); ctrlRef.current?.stopLoop()
    try {
      const { blob, ext } = await exportRecapVideo(tl, { W, H, acc, theme, bg: { stops: bgStops, image: photoRef.current }, fps: 30 }, (p) => setPct(Math.round(p * 100)))
      const name = `rewind-${String(periodLabel || '').replace(/\s+/g, '-').toLowerCase()}.${ext}`
      // mobile -> partage natif (vers Instagram, Photos…) ; PC -> téléchargement
      const res = await saveOrShare(blob, name, { title: 'Mon Rewind' })
      setToast(res === 'shared' ? 'Vidéo partagée 🎬' : res === 'aborted' ? 'Partage annulé' : `Vidéo ${ext.toUpperCase()} téléchargée 🎬`)
    } catch (err) {
      console.error(err)
      setToast("L'export vidéo a échoué sur ce navigateur.")
    } finally {
      setExporting(false); exportingRef.current = false
    }
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  return (
    <div className="recap" role="dialog" aria-label="Mon Rewind">
      <div className="recap-bars">
        {tl.items.map((_, i) => (
          <div className="recap-bar" key={i}><i ref={(el) => (barsRef.current[i] = el)} /></div>
        ))}
      </div>

      <button className="recap-close" onClick={onClose} aria-label="Fermer"><X size={22} /></button>

      <div className="recap-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}>
        <canvas ref={canvasRef} width={W} height={H} className="recap-canvas" />
        {exporting && (
          <div className="recap-export">
            <div className="recap-spinner" />
            <div className="recap-export-pct">{pct}%</div>
            <div className="recap-export-lbl">Génération de la vidéo…</div>
          </div>
        )}
      </div>

      <div className="recap-actions" onClick={(e) => e.stopPropagation()}>
        {ended && (
          <button className="btn btn-ghost" onClick={replay}><RotateCcw size={17} /> Rejouer</button>
        )}
        {ended && (
          <button className="btn btn-ghost" onClick={() => setGallery(true)}><Images size={17} /> Exporter des slides</button>
        )}
        {support !== 'none' ? (
          <button className="btn btn-strava" onClick={handleExport} disabled={exporting}>
            {exporting ? <><span className="spinner" /> {pct}%</> : <><Film size={18} /> Exporter la vidéo</>}
          </button>
        ) : (
          <div className="recap-note"><Download size={15} /> Export vidéo indisponible sur ce navigateur — utilise l'image.</div>
        )}
      </div>

      {gallery && (
        <div className="recap-gallery" onClick={(e) => e.stopPropagation()}>
          <div className="rg-head">
            <div className="rg-title">Choisis tes slides</div>
            <button className="btn btn-ghost btn-sm" onClick={toggleAll}>{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
            <button className="recap-close rg-close" onClick={() => setGallery(false)} aria-label="Fermer"><X size={20} /></button>
          </div>
          <div className="rg-grid">
            {tl.items.map((_, i) => (
              <button key={i} type="button" className={`rg-thumb ${sel.has(i) ? 'on' : ''}`} onClick={() => toggleSel(i)}>
                <canvas ref={(el) => (thumbRefs.current[i] = el)} width={200} height={356} />
                {sel.has(i) && <span className="rg-check"><Check size={16} /></span>}
              </button>
            ))}
          </div>
          <div className="rg-foot">
            <button className="btn btn-strava" onClick={exportSlides} disabled={exporting || !sel.size}>
              {exporting ? <><span className="spinner" /> Export…</> : <><Download size={18} /> Exporter {sel.size ? `(${sel.size})` : ''}</>}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="toast recap-toast">{toast}</div>}
    </div>
  )
}
