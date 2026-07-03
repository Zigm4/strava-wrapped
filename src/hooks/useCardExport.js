import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { FORMATS, isPoster } from '../data/formats.js'
import { saveOrShare } from '../lib/save.js'

// Machinerie d'export/preview de la carte : rendu PNG, partage/téléchargement/copie,
// échelle du preview, toast, et l'état `capturing` (fige la carte le temps du rendu).
export function useCardExport({ formatId, periodLabel }) {
  const cardRef = useRef(null)
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(0.42)
  const [exporting, setExporting] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [toast, setToast] = useState(null)

  const fmt = FORMATS[formatId]
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const recompute = () => {
      const pad = 32
      const s = Math.min((el.clientWidth - pad) / fmt.w, (el.clientHeight - pad) / fmt.h)
      setScale(Math.max(0.12, Math.min(s, 0.7)))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    window.addEventListener('resize', recompute)
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute) }
  }, [fmt.w, fmt.h])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  async function renderPng(pixelRatio) {
    setCapturing(true) // fige la carte (valeurs finales, sans animation d'entrée) le temps du rendu
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      if (document.fonts?.ready) await document.fonts.ready
      await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true }) // 1re passe : polices
      return await toPng(cardRef.current, { pixelRatio, cacheBust: true })
    } finally {
      setCapturing(false)
    }
  }
  const fileSlug = () => `rewind-${periodLabel.replace(/\s+/g, '-').toLowerCase()}`

  async function handleExport() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      // le poster s'exporte en très haute résolution (proche A3 @ 300 dpi) pour l'impression
      const dataUrl = await renderPng(isPoster(formatId) ? 3 : 2.5)
      const blob = await (await fetch(dataUrl)).blob()
      const res = await saveOrShare(blob, `${fileSlug()}.png`, { title: 'Mon Rewind' })
      setToast({ type: 'ok', msg: res === 'shared' ? 'Image partagée 🎉' : res === 'aborted' ? 'Partage annulé' : 'Image téléchargée 🎉' })
    } catch (err) {
      console.error(err)
      setToast({ type: 'err', msg: "L'export a échoué. Réessaie." })
    } finally {
      setExporting(false)
    }
  }

  async function handleShare() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const dataUrl = await renderPng(2)
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${fileSlug()}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mon mois sur Strava' })
      } else {
        const link = document.createElement('a')
        link.download = `${fileSlug()}.png`
        link.href = dataUrl
        link.click()
        setToast({ type: 'ok', msg: 'Partage indispo ici - image téléchargée' })
      }
    } catch (err) {
      if (err?.name !== 'AbortError') { console.error(err); setToast({ type: 'err', msg: 'Le partage a échoué.' }) }
    } finally {
      setExporting(false)
    }
  }

  async function handleCopy() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const dataUrl = await renderPng(2)
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      setToast({ type: 'ok', msg: 'Image copiée 📋' })
    } catch (err) {
      console.error(err)
      setToast({ type: 'err', msg: 'Copie impossible ici — télécharge plutôt.' })
    } finally {
      setExporting(false)
    }
  }

  return { cardRef, wrapRef, scale, exporting, capturing, toast, setToast, renderPng, handleExport, handleShare, handleCopy }
}
