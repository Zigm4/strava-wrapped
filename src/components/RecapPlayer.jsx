import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Play, Pause, RotateCcw, Film, Download } from 'lucide-react'
import { timeline, drawFrame } from '../lib/recapRender.js'
import { exportRecapVideo, videoSupport } from '../lib/videoExport.js'
import { bgCanvasColors } from '../data/backgrounds.js'
import { saveOrShare } from '../lib/save.js'

const W = 1080, H = 1920

// Lecteur plein écran du récap : lecture fluide sur canvas (rAF) + export vidéo.
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
    img.onload = () => { photoRef.current = img }
    img.src = photo
  }, [photo])

  const tRef = useRef(0)      // temps courant affiché (s)
  const baseRef = useRef(0)   // temps accumulé au début du segment de lecture
  const startRef = useRef(0)  // performance.now() au début du segment
  const playingRef = useRef(true)
  const rafRef = useRef(0)
  // recale l'horloge sur un temps donné (seek/pause/reprise)
  const seekTo = (t) => { tRef.current = t; baseRef.current = t; startRef.current = performance.now() }

  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pct, setPct] = useState(0)
  const [toast, setToast] = useState(null)
  const support = useMemo(() => videoSupport(), [])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let alive = true
    const draw = () => drawFrame(ctx, tl, tRef.current, { W, H, acc, theme, bg: { stops: bgStops, image: photoRef.current } })
    const updateBars = () => {
      tl.items.forEach((it, i) => {
        const el = barsRef.current[i]
        if (el) el.style.width = `${Math.max(0, Math.min(1, (tRef.current - it.start) / it.dur)) * 100}%`
      })
    }
    const loop = (now) => {
      if (!alive) return
      // temps réel écoulé -> vitesse de lecture constante quel que soit le fps
      if (playingRef.current && !exporting) {
        tRef.current = baseRef.current + (now - startRef.current) / 1000
        if (tRef.current >= tl.total) { tRef.current = tl.total; baseRef.current = tl.total; playingRef.current = false; setEnded(true); setPaused(true) }
      }
      draw()
      updateBars()
      rafRef.current = requestAnimationFrame(loop)
    }
    const start = () => { startRef.current = performance.now(); baseRef.current = tRef.current; rafRef.current = requestAnimationFrame(loop) }
    // précharge explicitement les polices utilisées sur le canvas (sinon fallback "banal")
    const fonts = document.fonts
    const ready = fonts?.load
      ? Promise.all([
          fonts.load('400 200px "Anton"'),
          fonts.load('700 100px "Space Grotesk"'),
          fonts.load('600 40px "Inter"'),
        ]).catch(() => {})
      : Promise.resolve()
    ready.then(() => { if (alive) start() })
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [tl, acc, theme, exporting, bgStops])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
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
    seekTo(tl.items[ni].start + 0.001)
    setEnded(false)
    playingRef.current = true
    setPaused(false)
  }
  function togglePause() {
    if (ended) { seekTo(0); setEnded(false); playingRef.current = true; setPaused(false); return }
    if (playingRef.current) {
      baseRef.current = tRef.current // fige le temps
      playingRef.current = false
      setPaused(true)
    } else {
      startRef.current = performance.now() // reprend depuis le temps figé
      baseRef.current = tRef.current
      playingRef.current = true
      setPaused(false)
    }
  }
  function replay() { seekTo(0); setEnded(false); playingRef.current = true; setPaused(false) }

  function onStageClick(e) {
    if (exporting) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    if (x < 0.33) go(-1)
    else if (x > 0.67) go(1)
    else togglePause()
  }

  async function handleExport() {
    if (exporting) return
    setExporting(true); setPct(0); playingRef.current = false; setPaused(true)
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
      setExporting(false)
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

      <div className="recap-stage" onClick={onStageClick}>
        <canvas ref={canvasRef} width={W} height={H} className="recap-canvas" />
        {paused && !exporting && !ended && (
          <div className="recap-hint"><Play size={40} /></div>
        )}
        {exporting && (
          <div className="recap-export">
            <div className="recap-spinner" />
            <div className="recap-export-pct">{pct}%</div>
            <div className="recap-export-lbl">Génération de la vidéo…</div>
          </div>
        )}
      </div>

      <div className="recap-actions" onClick={(e) => e.stopPropagation()}>
        {ended ? (
          <button className="btn btn-ghost" onClick={replay}><RotateCcw size={17} /> Rejouer</button>
        ) : (
          <button className="btn btn-ghost" onClick={togglePause}>{paused ? <><Play size={17} /> Lire</> : <><Pause size={17} /> Pause</>}</button>
        )}
        {support !== 'none' ? (
          <button className="btn btn-strava" onClick={handleExport} disabled={exporting}>
            {exporting ? <><span className="spinner" /> {pct}%</> : <><Film size={18} /> Exporter la vidéo</>}
          </button>
        ) : (
          <div className="recap-note"><Download size={15} /> Export vidéo indisponible sur ce navigateur — utilise l'image.</div>
        )}
      </div>

      {toast && <div className="toast recap-toast">{toast}</div>}
    </div>
  )
}
