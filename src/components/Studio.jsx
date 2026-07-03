import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { toPng } from 'html-to-image'
import Controls from './Controls.jsx'
import StoryCard from './StoryCard.jsx'
import PosterCard from './PosterCard.jsx'
import RecapPlayer from './RecapPlayer.jsx'
import { buildRecap } from '../lib/recap.js'
import { aggregate, availableFamilies, personalBestIds } from '../lib/aggregate.js'
import { familyKey, FAMILIES } from '../lib/activityTypes.js'
import { reverseGeocode } from '../lib/geocode.js'
import { monthShort, monthLabel } from '../lib/format.js'
import { buildSnapshot, shareUrl } from '../lib/share.js'
import { saveOrShare } from '../lib/save.js'
import { localYear, localMonth, localParts, localTime } from '../lib/date.js'
import { monthHeatmap, yearHeatmap } from '../lib/heatmap.js'
import { FORMATS, isPoster } from '../data/formats.js'
import { BACKGROUNDS, DEFAULT_BG, ACCENTS, DEFAULT_ACCENT } from '../data/backgrounds.js'

function makeMonth(year, m, count) {
  return { key: `${year}-${m}`, year, month: m, short: monthShort(m), label: monthLabel(year, m), count }
}

// `outOfRange` : mois antérieur au début de l'historique téléchargé (donnée non récupérée,
// à distinguer d'un mois réellement sans activité).
function makeMonthEx(year, m, count, floor) {
  const out = makeMonth(year, m, count)
  out.outOfRange = !!floor && (year < floor.year || (year === floor.year && m < floor.month))
  return out
}

// Les 12 mois d'une année donnée, avec le nb d'activités.
function buildMonthsForYear(activities, year, floor) {
  const counts = {}
  for (const a of activities) {
    if (localYear(a.start_date_local) === year) {
      const m = localMonth(a.start_date_local)
      counts[m] = (counts[m] || 0) + 1
    }
  }
  return Array.from({ length: 12 }, (_, m) => makeMonthEx(year, m, counts[m] || 0, floor))
}

// Mois de l'activité la plus récente (pour la sélection par défaut).
function mostRecentMonth(activities) {
  if (!activities.length) { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } }
  let best = null, bestT = -Infinity
  for (const a of activities) { const x = localTime(a.start_date_local); if (x > bestT) { bestT = x; best = a } }
  const p = localParts(best.start_date_local)
  return { year: p.year, month: p.month }
}

function buildYears(activities) {
  const counts = {}
  for (const a of activities) {
    const y = localYear(a.start_date_local)
    counts[y] = (counts[y] || 0) + 1
  }
  let years = Object.keys(counts).map(Number).sort((a, b) => b - a).map((y) => ({ year: y, count: counts[y] }))
  if (!years.length) years = [{ year: new Date().getFullYear(), count: 0 }]
  return years
}

const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare
const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard && typeof window !== 'undefined' && typeof window.ClipboardItem !== 'undefined'

export default function Studio({ activities, athleteName, isDemo, coverageStart }) {
  const dataFloor = coverageStart || null // { year, month } : début de l'historique téléchargé
  const years = useMemo(() => buildYears(activities), [activities])
  const mr = useMemo(() => mostRecentMonth(activities), [activities])
  const nowYear = new Date().getFullYear()
  const yearList = years.map((y) => y.year)
  const minYear = Math.min(nowYear, ...yearList)
  const maxYear = Math.max(nowYear, ...yearList)

  const [period, setPeriod] = useState('month')
  const [year, setYear] = useState(() => years[0].year)
  const [monthViewYear, setMonthViewYear] = useState(mr.year)
  const [month, setMonth] = useState(() => makeMonth(mr.year, mr.month, 0))
  const months = useMemo(() => buildMonthsForYear(activities, monthViewYear, dataFloor), [activities, monthViewYear, dataFloor])

  const [allActive, setAllActive] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [formatId, setFormatId] = useState('story')
  const [bgId, setBgId] = useState(DEFAULT_BG.id)
  const [accentId, setAccentId] = useState(DEFAULT_ACCENT.id)
  const [theme, setTheme] = useState('dark')
  const [photo, setPhoto] = useState(null)
  const [scrim, setScrim] = useState(DEFAULT_BG.scrim)
  const [title, setTitle] = useState('')
  const [handle, setHandle] = useState('')
  const [privacy, setPrivacy] = useState(true) // masquer le départ/arrivée du tracé
  const [showHeatmap, setShowHeatmap] = useState(false) // calendrier jour-par-jour (à la place de la carte)
  const [compareMode, setCompareMode] = useState('off') // 'off' | 'prev' | 'yoy'
  const [exporting, setExporting] = useState(false)
  const [capturing, setCapturing] = useState(false) // fige les animations le temps du rendu PNG
  const [showRecap, setShowRecap] = useState(false) // lecteur vidéo plein écran
  const [toast, setToast] = useState(null)

  const background = BACKGROUNDS.find((b) => b.id === bgId) || DEFAULT_BG
  const accent = ACCENTS.find((a) => a.id === accentId) || DEFAULT_ACCENT

  const periodActivities = useMemo(() => {
    if (period === 'year') return activities.filter((a) => localYear(a.start_date_local) === year)
    return activities.filter((a) => localYear(a.start_date_local) === month.year && localMonth(a.start_date_local) === month.month)
  }, [activities, period, year, month])

  // activités de la période après filtre de familles (pour le poster mosaïque)
  const filteredActivities = useMemo(
    () => (allActive ? periodActivities : periodActivities.filter((a) => selected.has(familyKey(a.type)))),
    [periodActivities, allActive, selected],
  )
  const availFamilies = useMemo(() => availableFamilies(periodActivities), [periodActivities])
  // records perso calculés sur TOUT l'historique (pas seulement la période)
  const recordIds = useMemo(() => personalBestIds(activities), [activities])
  const summary = useMemo(() => aggregate(periodActivities, allActive ? null : selected, recordIds), [periodActivities, allActive, selected, recordIds])

  // Spot favori : on géocode le point GPS réel pour les VRAIES données (le champ "ville" de
  // Strava est souvent périmé/faux). En démo, les villes intégrées sont justes -> pas de réseau.
  const [geo, setGeo] = useState(null)
  const [geoPending, setGeoPending] = useState(false)
  const fs = summary.favoriteSpot
  const spotLat = fs?.latlng?.[0]
  const spotLng = fs?.latlng?.[1]
  useEffect(() => {
    if (isDemo || fs == null || spotLat == null) { setGeo(null); setGeoPending(false); return }
    let cancelled = false
    setGeoPending(true)
    reverseGeocode(spotLat, spotLng).then((r) => { if (!cancelled) { setGeo(r); setGeoPending(false) } })
    return () => { cancelled = true }
  }, [isDemo, spotLat, spotLng])

  const spot = fs ? {
    // pendant une capture PNG, on n'écrit jamais le placeholder "Localisation…" dans l'image
    name: isDemo
      ? (fs.city || 'Ton terrain de jeu')
      : (geo?.city || (geoPending && !capturing ? 'Localisation…' : (fs.city || 'Ton terrain de jeu'))),
    region: (isDemo ? [fs.state, fs.country] : [geo?.region, geo?.country]).filter(Boolean).join(' · ') || null,
    count: fs.count,
    distance: fs.distance,
    elevation: fs.elevation,
    type: fs.topType,
  } : null

  const periodLabel = period === 'year' ? String(year) : month.label
  const defaultTitle = athleteName || (period === 'year' ? 'Mon année' : 'Mon mois')
  const resolvedTitle = title.trim() || defaultTitle

  // Période de référence pour la comparaison, selon le mode :
  //   'prev' -> mois (ou année) précédent ; 'yoy' -> même mois l'an dernier (année N-1 si bilan annuel).
  // `partial` = la comparaison serait trompeuse : période courante incomplète, ou période de
  // référence antérieure à l'historique téléchargé (donnée manquante, pas "zéro activité").
  const referencePeriod = useMemo(() => (mode) => {
    const now = new Date()
    const currentIncomplete =
      (period === 'month' && month.year === now.getFullYear() && month.month === now.getMonth()) ||
      (period === 'year' && year === now.getFullYear())

    let refYear, refMonth, label
    if (period === 'year') {
      refYear = year - 1; refMonth = null; label = String(year - 1)
    } else if (mode === 'yoy') {
      refYear = month.year - 1; refMonth = month.month; label = `${monthShort(month.month)} ${month.year - 1}`
    } else {
      const pm = new Date(month.year, month.month - 1, 1)
      refYear = pm.getFullYear(); refMonth = pm.getMonth(); label = monthShort(refMonth)
    }

    const prevActs = activities.filter((a) => {
      if (localYear(a.start_date_local) !== refYear) return false
      return refMonth == null || localMonth(a.start_date_local) === refMonth
    })

    // La période de référence commence-t-elle avant le début de l'historique téléchargé ?
    const refM = refMonth == null ? 0 : refMonth
    const beforeFloor = !!dataFloor &&
      (refYear < dataFloor.year || (refYear === dataFloor.year && refM < dataFloor.month))

    const reason = currentIncomplete ? 'incomplete' : beforeFloor ? 'nohistory' : null
    return { prevActs, label, partial: !!reason, reason }
  }, [activities, period, year, month, dataFloor])

  // effet du mode sur la période de référence : 'yoy' -> même mois l'an dernier ; sinon période précédente
  const refMode = compareMode === 'yoy' ? 'yoy' : 'prev'

  // comparaison de distance globale (le "+X %"), même filtre de types
  const comparison = useMemo(() => {
    const ref = referencePeriod(refMode)
    if (ref.partial) return null
    const keep = (a) => allActive || selected.has(familyKey(a.type))
    const sum = (arr) => arr.filter(keep).reduce((s, a) => s + (a.distance || 0), 0)
    const cur = sum(periodActivities), prev = sum(ref.prevActs)
    if (prev <= 0 || cur <= 0) return null
    // cur/prev (mètres) exposés pour afficher un multiplicateur quand le % explose (repart de ~0)
    return { pct: Math.round(((cur - prev) / prev) * 100), label: ref.label, cur, prev }
  }, [referencePeriod, refMode, periodActivities, allActive, selected])

  // écart de distance par type de sport vs la période de référence (union des sports, filtre respecté)
  const typeCompare = useMemo(() => {
    const ref = referencePeriod(refMode)
    const group = (acts) => {
      const m = {}
      for (const a of acts) {
        const k = familyKey(a.type)
        if (!allActive && !selected.has(k)) continue
        if (!m[k]) m[k] = { dist: 0, elev: 0 }
        m[k].dist += a.distance || 0
        m[k].elev += a.total_elevation_gain || 0
      }
      return m
    }
    const cur = group(periodActivities), prev = group(ref.prevActs)
    const rows = [...new Set([...Object.keys(cur), ...Object.keys(prev)])]
      .map((k) => {
        const c = cur[k] || { dist: 0, elev: 0 }
        const p = prev[k] || { dist: 0, elev: 0 }
        return {
          key: k, label: FAMILIES[k].label, color: FAMILIES[k].color,
          current: c.dist, previous: p.dist, delta: c.dist - p.dist,
          deltaElev: c.elev - p.elev,
        }
      })
      .sort((a, b) => Math.max(b.current, b.previous) - Math.max(a.current, a.previous))
    return { rows, label: ref.label, partial: ref.partial, reason: ref.reason }
  }, [referencePeriod, refMode, periodActivities, allActive, selected])

  // deltas réellement affichables ? (mode actif ET référence fiable)
  const deltaActive = compareMode !== 'off' && !typeCompare.partial && typeCompare.rows.length > 0

  // heatmap calendrier de la période (jour par jour)
  const heatmap = useMemo(() => {
    const daily = summary.dailyDistance || {}
    return period === 'year' ? yearHeatmap(year, daily) : monthHeatmap(month.year, month.month, daily)
  }, [period, year, month, summary])

  // slides du récap vidéo (façon story animée)
  const recapSlides = useMemo(
    () => buildRecap(summary, {
      period, year, month: month.month, periodLabel, athleteName, privacy,
      comparison, typeCompare, compareMode, heatmap, activities: filteredActivities,
    }),
    [summary, period, year, month, periodLabel, athleteName, privacy, comparison, typeCompare, compareMode, heatmap, filteredActivities],
  )

  function resetFilters() { setAllActive(true); setSelected(new Set()) }
  function selectMonth(m) { setMonth(m); resetFilters() }
  function selectYear(y) { setYear(y); resetFilters() }
  function selectPeriod(p) { setPeriod(p); resetFilters() }
  function prevMonthYear() { setMonthViewYear((y) => Math.max(minYear, y - 1)) }
  function nextMonthYear() { setMonthViewYear((y) => Math.min(maxYear, y + 1)) }

  function toggleFamily(k) {
    setSelected((prev) => {
      const next = new Set(allActive ? [] : prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      if (next.size === 0) { setAllActive(true); return new Set() }
      setAllActive(false)
      return next
    })
  }

  function chooseBg(id) {
    setPhoto(null)
    setBgId(id)
    const b = BACKGROUNDS.find((x) => x.id === id)
    if (b) { setScrim(b.scrim); setTheme(b.light ? 'light' : 'dark') }
  }
  function choosePhoto(dataUrl) { setPhoto(dataUrl); setScrim(0.7) }
  function clearPhoto() { setPhoto(null); setScrim(background.scrim) }

  // échelle du preview
  const fmt = FORMATS[formatId]
  const wrapRef = useRef(null)
  const cardRef = useRef(null)
  const [scale, setScale] = useState(0.42)

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

  async function renderPng(pixelRatio) {
    setCapturing(true) // fige la carte (valeurs finales, sans animation d'entrée) le temps du rendu
    // laisse React re-rendre en mode figé, puis attend un frame de layout
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
      // mobile -> partage natif ; PC -> téléchargement
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

  // Lien Wrapped partageable : snapshot compact -> #w=... copié dans le presse-papiers.
  async function handleShareLink() {
    let url
    try {
      const snap = buildSnapshot({
        summary, formatId, bgId, accentId, theme, scrim,
        periodLabel, title: resolvedTitle, handle: handle.trim(), privacy,
        spot, comparison, showDeltas: deltaActive, typeCompare, showHeatmap, heatmap,
      })
      url = shareUrl(snap)
    } catch (err) {
      console.error(err)
      setToast({ type: 'err', msg: 'Lien impossible à créer.' })
      return
    }
    if (url.length > 14000) {
      setToast({ type: 'err', msg: 'Carte trop riche pour un lien — partage plutôt l\'image.' })
      return
    }
    // La copie peut échouer (presse-papiers refusé, page sans focus) : on retombe sur un prompt.
    try {
      await navigator.clipboard.writeText(url)
      setToast({ type: 'ok', msg: 'Lien copié 🔗 colle-le où tu veux' })
    } catch {
      window.prompt('Copie ton lien Rewind :', url)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="studio">
      <Controls
        period={period} onPeriod={selectPeriod}
        months={months} selectedMonthKey={month.key} onSelectMonth={selectMonth}
        monthViewYear={monthViewYear} onPrevYear={prevMonthYear} onNextYear={nextMonthYear}
        canPrevYear={monthViewYear > minYear} canNextYear={monthViewYear < maxYear}
        years={years} selectedYear={year} onSelectYear={selectYear}
        availFamilies={availFamilies} selectedFamilies={selected} onToggleFamily={toggleFamily}
        onAllFamilies={resetFilters} allActive={allActive}
        compareMode={compareMode} onCompareMode={setCompareMode} deltaLabel={typeCompare.label}
        comparePartial={compareMode !== 'off' && typeCompare.partial} compareReason={typeCompare.reason}
        formatId={formatId} onFormat={setFormatId}
        title={title} onTitle={setTitle} handle={handle} onHandle={setHandle}
        backgrounds={BACKGROUNDS} bgId={bgId} onBg={chooseBg}
        accents={ACCENTS} accentId={accentId} onAccent={setAccentId}
        theme={theme} onTheme={setTheme}
        privacy={privacy} onPrivacy={setPrivacy}
        showHeatmap={showHeatmap} onHeatmap={setShowHeatmap}
        photo={photo} onPhoto={choosePhoto} onClearPhoto={clearPhoto}
        scrim={scrim} onScrim={setScrim}
        onExport={handleExport} exporting={exporting} onShare={handleShare} canShare={canShare}
        onCopy={handleCopy} canCopy={canCopy}
        onShareLink={handleShareLink}
        onPlayRecap={recapSlides.length > 1 ? () => setShowRecap(true) : null}
      />

      <div className="stage-wrap" ref={wrapRef}>
        <div className="stage" style={{ transform: `scale(${scale})` }}>
          {isPoster(formatId) ? (
            <PosterCard
              ref={cardRef}
              activities={filteredActivities}
              summary={summary}
              title={resolvedTitle}
              handle={handle.trim()}
              periodLabel={periodLabel}
              background={background}
              photo={photo}
              scrim={scrim}
              accent={accent}
              theme={theme}
              privacy={privacy}
            />
          ) : (
            <StoryCard
              ref={cardRef}
              summary={summary}
              formatId={formatId}
              background={background}
              photo={photo}
              periodLabel={periodLabel}
              scrim={scrim}
              accent={accent}
              theme={theme}
              title={resolvedTitle}
              handle={handle.trim()}
              spot={spot}
              privacy={privacy}
              comparison={comparison}
              showDeltas={deltaActive}
              typeCompare={typeCompare}
              showHeatmap={showHeatmap}
              heatmap={heatmap}
              still={capturing}
            />
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast.type === 'ok' ? '✅' : '⚠️'} {toast.msg}</div>}

      {showRecap && (
        <RecapPlayer
          slides={recapSlides}
          acc={accent}
          theme={theme}
          background={background}
          photo={photo}
          periodLabel={periodLabel}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  )
}
