import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { toPng } from 'html-to-image'
import Controls from './Controls.jsx'
import StoryCard from './StoryCard.jsx'
import { aggregate, availableFamilies, personalBestIds } from '../lib/aggregate.js'
import { familyKey, FAMILIES } from '../lib/activityTypes.js'
import { reverseGeocode } from '../lib/geocode.js'
import { monthShort, monthLabel } from '../lib/format.js'
import { FORMATS } from '../data/formats.js'
import { BACKGROUNDS, DEFAULT_BG, ACCENTS, DEFAULT_ACCENT } from '../data/backgrounds.js'

function makeMonth(year, m, count) {
  return { key: `${year}-${m}`, year, month: m, short: monthShort(m), label: monthLabel(year, m), count }
}

// Les 12 mois d'une année donnée, avec le nb d'activités.
function buildMonthsForYear(activities, year) {
  const counts = {}
  for (const a of activities) {
    const d = new Date(a.start_date_local)
    if (d.getFullYear() === year) counts[d.getMonth()] = (counts[d.getMonth()] || 0) + 1
  }
  return Array.from({ length: 12 }, (_, m) => makeMonth(year, m, counts[m] || 0))
}

// Mois de l'activité la plus récente (pour la sélection par défaut).
function mostRecentMonth(activities) {
  if (!activities.length) { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } }
  let t = -Infinity
  for (const a of activities) { const x = new Date(a.start_date_local).getTime(); if (x > t) t = x }
  const d = new Date(t)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function buildYears(activities) {
  const counts = {}
  for (const a of activities) {
    const y = new Date(a.start_date_local).getFullYear()
    counts[y] = (counts[y] || 0) + 1
  }
  let years = Object.keys(counts).map(Number).sort((a, b) => b - a).map((y) => ({ year: y, count: counts[y] }))
  if (!years.length) years = [{ year: new Date().getFullYear(), count: 0 }]
  return years
}

const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare

export default function Studio({ activities, athleteName, isDemo }) {
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
  const months = useMemo(() => buildMonthsForYear(activities, monthViewYear), [activities, monthViewYear])

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
  const [showDeltas, setShowDeltas] = useState(false) // écart par type vs période précédente
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(null)

  const background = BACKGROUNDS.find((b) => b.id === bgId) || DEFAULT_BG
  const accent = ACCENTS.find((a) => a.id === accentId) || DEFAULT_ACCENT

  const periodActivities = useMemo(() => {
    if (period === 'year') return activities.filter((a) => new Date(a.start_date_local).getFullYear() === year)
    return activities.filter((a) => {
      const d = new Date(a.start_date_local)
      return d.getFullYear() === month.year && d.getMonth() === month.month
    })
  }, [activities, period, year, month])

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
    name: isDemo
      ? (fs.city || 'Ton terrain de jeu')
      : (geo?.city || (geoPending ? 'Localisation…' : (fs.city || 'Ton terrain de jeu'))),
    region: (isDemo ? [fs.state, fs.country] : [geo?.region, geo?.country]).filter(Boolean).join(' · ') || null,
    count: fs.count,
    distance: fs.distance,
    elevation: fs.elevation,
    type: fs.topType,
  } : null

  const periodLabel = period === 'year' ? String(year) : month.label
  const defaultTitle = athleteName || (period === 'year' ? 'Mon année' : 'Mon mois')
  const resolvedTitle = title.trim() || defaultTitle

  // comparaison de distance vs période précédente (même filtre de types)
  const comparison = useMemo(() => {
    // période en cours = incomplète -> comparaison trompeuse, on s'abstient
    const now = new Date()
    if (period === 'month' && month.year === now.getFullYear() && month.month === now.getMonth()) return null
    if (period === 'year' && year === now.getFullYear()) return null
    const keep = (a) => allActive || selected.has(familyKey(a.type))
    let prevActs, label
    if (period === 'year') {
      prevActs = activities.filter((a) => new Date(a.start_date_local).getFullYear() === year - 1)
      label = String(year - 1)
    } else {
      const pm = new Date(month.year, month.month - 1, 1)
      prevActs = activities.filter((a) => {
        const d = new Date(a.start_date_local)
        return d.getFullYear() === pm.getFullYear() && d.getMonth() === pm.getMonth()
      })
      label = monthShort(pm.getMonth())
    }
    const sum = (arr) => arr.filter(keep).reduce((s, a) => s + (a.distance || 0), 0)
    const cur = sum(periodActivities), prev = sum(prevActs)
    if (prev <= 0 || cur <= 0) return null
    return { pct: Math.round(((cur - prev) / prev) * 100), label }
  }, [activities, period, year, month, periodActivities, allActive, selected])

  // écart de distance par type de sport vs la période précédente (union des sports, filtre respecté)
  const typeCompare = useMemo(() => {
    const group = (acts) => {
      const m = {}
      for (const a of acts) {
        const k = familyKey(a.type)
        if (!allActive && !selected.has(k)) continue
        m[k] = (m[k] || 0) + (a.distance || 0)
      }
      return m
    }
    let prevActs, label
    if (period === 'year') {
      prevActs = activities.filter((a) => new Date(a.start_date_local).getFullYear() === year - 1)
      label = String(year - 1)
    } else {
      const pm = new Date(month.year, month.month - 1, 1)
      prevActs = activities.filter((a) => {
        const d = new Date(a.start_date_local)
        return d.getFullYear() === pm.getFullYear() && d.getMonth() === pm.getMonth()
      })
      label = monthShort(pm.getMonth())
    }
    const cur = group(periodActivities), prev = group(prevActs)
    const rows = [...new Set([...Object.keys(cur), ...Object.keys(prev)])]
      .map((k) => ({
        key: k, label: FAMILIES[k].label, color: FAMILIES[k].color,
        current: cur[k] || 0, previous: prev[k] || 0, delta: (cur[k] || 0) - (prev[k] || 0),
      }))
      .sort((a, b) => Math.max(b.current, b.previous) - Math.max(a.current, a.previous))
    return { rows, label }
  }, [activities, period, year, month, periodActivities, allActive, selected])

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
    if (document.fonts?.ready) await document.fonts.ready
    await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true }) // 1re passe : polices
    return toPng(cardRef.current, { pixelRatio, cacheBust: true })
  }
  const fileSlug = () => `strava-${periodLabel.replace(/\s+/g, '-').toLowerCase()}`

  async function handleExport() {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const dataUrl = await renderPng(2.5)
      const link = document.createElement('a')
      link.download = `${fileSlug()}.png`
      link.href = dataUrl
      link.click()
      setToast({ type: 'ok', msg: 'Image téléchargée 🎉' })
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
        showDeltas={showDeltas} onDeltas={setShowDeltas} deltaLabel={typeCompare.label}
        formatId={formatId} onFormat={setFormatId}
        title={title} onTitle={setTitle} handle={handle} onHandle={setHandle}
        backgrounds={BACKGROUNDS} bgId={bgId} onBg={chooseBg}
        accents={ACCENTS} accentId={accentId} onAccent={setAccentId}
        theme={theme} onTheme={setTheme}
        privacy={privacy} onPrivacy={setPrivacy}
        photo={photo} onPhoto={choosePhoto} onClearPhoto={clearPhoto}
        scrim={scrim} onScrim={setScrim}
        onExport={handleExport} exporting={exporting} onShare={handleShare} canShare={canShare}
      />

      <div className="stage-wrap" ref={wrapRef}>
        <div className="stage" style={{ transform: `scale(${scale})` }}>
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
            showDeltas={showDeltas}
            typeCompare={typeCompare}
          />
        </div>
      </div>

      {toast && <div className="toast">{toast.type === 'ok' ? '✅' : '⚠️'} {toast.msg}</div>}
    </div>
  )
}
