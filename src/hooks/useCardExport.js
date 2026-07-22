import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { FORMATS, isPoster } from '../data/formats.js'
import { isMobile, saveOrShare } from '../lib/save.js'

// Beaucoup de navigateurs mobiles plafonnent un <canvas> (~4096 px de côté) : au-delà,
// toDataURL rend une image vide ou échoue -> l'export « échoue ». On borne le plus grand
// côté en conséquence (marge sous 4096), généreux sur desktop.
const MAX_CANVAS_SIDE = isMobile() ? 4000 : 8192

// Résolution des exports « réseaux sociaux » : la carte fait déjà 1080×1920 (taille native
// d'une story Instagram). 1,5× suffit largement et donne des fichiers ~3× plus légers que 2,5×.
const IG_RATIO = 1.5

// data-URL -> Blob SANS fetch(). Indispensable : la CSP du site (connect-src) n'autorise pas
// le schéma `data:`, donc `fetch(dataUrl)` est bloqué en prod -> l'export échouait sur mobile.
// Ici on décode le base64 nous-mêmes, hors réseau, hors CSP.
function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, comma)
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png'
  const bin = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

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
      const node = cardRef.current
      // borne la résolution pour ne jamais dépasser la limite canvas du navigateur (mobile surtout)
      const capped = Math.min(pixelRatio, MAX_CANVAS_SIDE / Math.max(fmt.w, fmt.h))
      // 1re passe (best-effort) : inline les polices ; un échec ne doit pas tuer l'export
      try { await toPng(node, { pixelRatio: 1, cacheBust: true }) } catch { /* noop */ }
      // rendu final avec repli progressif : si le device refuse encore la taille, on retente plus petit
      // (throw OU dataURL vide) plutôt que d'abandonner et d'afficher « réessaie ».
      let lastErr = null
      for (const pr of [capped, capped * 0.75, capped * 0.5, 1]) {
        try {
          const url = await toPng(node, { pixelRatio: pr, cacheBust: true })
          if (url && url.length > 2000) return url // dataURL valide (pas un canvas vide)
        } catch (e) { lastErr = e }
      }
      throw lastErr || new Error('png-export-vide')
    } finally {
      setCapturing(false)
    }
  }
  const fileSlug = () => `rewind-${periodLabel.replace(/\s+/g, '-').toLowerCase()}`

  async function handleExport() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      // le poster garde une haute résolution (impression) ; les formats réseaux -> IG_RATIO (léger)
      const dataUrl = await renderPng(isPoster(formatId) ? 3 : IG_RATIO)
      const blob = dataUrlToBlob(dataUrl)
      const res = await saveOrShare(blob, `${fileSlug()}.png`, { title: 'Mon Rewind' })
      setToast({ type: 'ok', msg: res === 'shared' ? 'Image partagée 🎉' : res === 'aborted' ? 'Partage annulé' : 'Image téléchargée 🎉' })
    } catch (err) {
      console.error(err)
      setToast({ type: 'err', msg: `L'export a échoué (${err?.name || 'erreur'}). Réessaie.` })
    } finally {
      setExporting(false)
    }
  }

  async function handleShare() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const dataUrl = await renderPng(IG_RATIO)
      const blob = dataUrlToBlob(dataUrl)
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
      const dataUrl = await renderPng(IG_RATIO)
      const blob = dataUrlToBlob(dataUrl)
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      setToast({ type: 'ok', msg: 'Image copiée 📋' })
    } catch (err) {
      console.error(err)
      setToast({ type: 'err', msg: 'Copie impossible ici, télécharge plutôt.' })
    } finally {
      setExporting(false)
    }
  }

  return { cardRef, wrapRef, scale, exporting, capturing, toast, setToast, renderPng, handleExport, handleShare, handleCopy }
}
