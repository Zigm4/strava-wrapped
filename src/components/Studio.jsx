import { useMemo, useState } from 'react'
import Controls from './Controls.jsx'
import StoryCard from './StoryCard.jsx'
import WeeklyCard from './WeeklyCard.jsx'
import PosterCard from './PosterCard.jsx'
import RecapPlayer from './RecapPlayer.jsx'
import { aggregate, personalBestIds } from '../lib/aggregate.js'
import { weekdayByType } from '../lib/selectors.js'
import { buildRecap, buildWeeklyRecap } from '../lib/recap.js'
import { buildSnapshot, shareUrl } from '../lib/share.js'
import { monthHeatmap, yearHeatmap } from '../lib/heatmap.js'
import { BACKGROUNDS, ACCENTS } from '../data/backgrounds.js'
import { isPoster } from '../data/formats.js'
import { usePeriod } from '../hooks/usePeriod.js'
import { useFamilyFilter } from '../hooks/useFamilyFilter.js'
import { useCardOptions } from '../hooks/useCardOptions.js'
import { useComparison } from '../hooks/useComparison.js'
import { useSpots } from '../hooks/useSpots.js'
import { useCardExport } from '../hooks/useCardExport.js'

const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare
const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard && typeof window !== 'undefined' && typeof window.ClipboardItem !== 'undefined'

// Studio = composition : chaque responsabilité vit dans un hook (période, filtre, apparence,
// comparaison, spot, export) ; ce composant les assemble et branche la carte + les contrôles.
export default function Studio({ activities, athleteName, isDemo, coverageStart }) {
  const dataFloor = coverageStart || null // { year, month } : début de l'historique téléchargé

  const per = usePeriod(activities, dataFloor)
  const filter = useFamilyFilter(per.periodActivities)
  const opt = useCardOptions()
  const [showRecap, setShowRecap] = useState(false) // lecteur vidéo plein écran

  // records perso calculés sur TOUT l'historique (pas seulement la période)
  const recordIds = useMemo(() => personalBestIds(activities), [activities])
  const summary = useMemo(
    () => aggregate(per.periodActivities, filter.allActive ? null : filter.selected, recordIds),
    [per.periodActivities, filter.allActive, filter.selected, recordIds],
  )

  const cmp = useComparison({
    activities, period: per.period, year: per.year, month: per.month, dataFloor,
    periodActivities: per.periodActivities, allActive: filter.allActive, selected: filter.selected, compareMode: opt.compareMode,
  })

  const exp = useCardExport({ formatId: opt.formatId, periodLabel: per.periodLabel })
  const sp = useSpots(summary, { isDemo, capturing: exp.capturing })
  const spot = sp.spot

  // Le spot choisi pilote la mini-carte : heroRoute = le tracé de CE spot (ou null s'il n'a
  // pas de trace GPS -> la carte laisse place au repli, jamais le tracé d'un autre spot).
  // Cas par défaut (spot #0) : sp.spot.route === summary.heroRoute -> identique à avant.
  const cardSummary = useMemo(
    () => (sp.spot ? { ...summary, heroRoute: sp.spot.route } : summary),
    [summary, sp.spot?.route],
  )

  const defaultTitle = athleteName || (per.period === 'year' ? 'Mon année' : per.period === 'week' ? 'Ma semaine' : 'Mon mois')
  const resolvedTitle = opt.title.trim() || defaultTitle

  // Données de la carte hebdo : distances par jour (lundi→dimanche) sur les activités filtrées,
  // et l'index du jour d'aujourd'hui s'il tombe dans la semaine affichée (pour le repère "aujourd'hui").
  const weekByType = useMemo(
    () => (per.period === 'week' ? weekdayByType(filter.filteredActivities) : []),
    [per.period, filter.filteredActivities],
  )
  const weekPerDay = useMemo(() => weekByType.map((d) => d.total), [weekByType])
  const weekTodayIdx = useMemo(() => {
    if (per.period !== 'week') return -1
    const now = new Date()
    const today = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000)
    const off = today - per.week.mondayOrdinal
    return off >= 0 && off <= 6 ? off : -1
  }, [per.period, per.week])
  const weekGoalKm = parseFloat(opt.weeklyGoalKm)
  // identité stable -> évite de relancer l'effet fit-to-frame de WeeklyCard à chaque render
  const weekEvent = useMemo(
    () => ({ name: opt.objectiveText.trim(), date: opt.objectiveDate }),
    [opt.objectiveText, opt.objectiveDate],
  )

  // heatmap calendrier de la période (jour par jour)
  const heatmap = useMemo(() => {
    const daily = summary.dailyDistance || {}
    return per.period === 'year' ? yearHeatmap(per.year, daily) : monthHeatmap(per.month.year, per.month.month, daily)
  }, [per.period, per.year, per.month, summary])

  // slides du récap vidéo (façon story animée) — variante hebdo pour la semaine
  const recapSlides = useMemo(
    () => (per.period === 'week'
      ? buildWeeklyRecap(summary, { periodLabel: per.periodLabel, athleteName, privacy: opt.privacy, perDay: weekPerDay, perDayByType: weekByType, event: weekEvent, goal: weekGoalKm })
      : buildRecap(summary, {
        period: per.period, year: per.year, month: per.month.month, periodLabel: per.periodLabel, athleteName, privacy: opt.privacy,
        comparison: cmp.comparison, typeCompare: cmp.typeCompare, compareMode: opt.compareMode, heatmap, activities: filter.filteredActivities,
      })),
    [summary, per.period, per.year, per.month, per.periodLabel, athleteName, opt.privacy, cmp.comparison, cmp.typeCompare, opt.compareMode, heatmap, filter.filteredActivities, weekPerDay, weekEvent, weekGoalKm],
  )

  // changer de semaine/mois/année/période réinitialise le filtre de familles
  const selectMonth = (m) => { per.setMonth(m); filter.resetFilters() }
  const selectYear = (y) => { per.setYear(y); filter.resetFilters() }
  const selectWeek = (w) => { per.setWeek(w); filter.resetFilters() }
  const selectPeriod = (p) => { per.setPeriod(p); filter.resetFilters() }

  // Lien Wrapped partageable : snapshot compact -> #w=... copié dans le presse-papiers.
  async function handleShareLink() {
    let url
    try {
      const snap = buildSnapshot({
        summary: cardSummary, formatId: opt.formatId, bgId: opt.bgId, accentId: opt.accentId, theme: opt.theme, scrim: opt.scrim,
        periodLabel: per.periodLabel, title: resolvedTitle, handle: opt.handle.trim(), privacy: opt.privacy,
        spot, comparison: cmp.comparison, showDeltas: cmp.deltaActive, typeCompare: cmp.typeCompare, showHeatmap: opt.showHeatmap, heatmap,
      })
      url = shareUrl(snap)
    } catch (err) {
      console.error(err)
      exp.setToast({ type: 'err', msg: 'Lien impossible à créer.' })
      return
    }
    if (url.length > 14000) {
      exp.setToast({ type: 'err', msg: 'Carte trop riche pour un lien — partage plutôt l\'image.' })
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      exp.setToast({ type: 'ok', msg: 'Lien copié 🔗 colle-le où tu veux' })
    } catch {
      window.prompt('Copie ton lien Rewind :', url)
    }
  }

  return (
    <div className="studio">
      <Controls
        period={per.period} onPeriod={selectPeriod}
        months={per.months} selectedMonthKey={per.month.key} onSelectMonth={selectMonth}
        monthViewYear={per.monthViewYear} onPrevYear={per.prevMonthYear} onNextYear={per.nextMonthYear}
        canPrevYear={per.canPrevYear} canNextYear={per.canNextYear}
        years={per.years} selectedYear={per.year} onSelectYear={selectYear}
        weeks={per.weeks} selectedWeekKey={per.week.key} onSelectWeek={selectWeek}
        objectiveText={opt.objectiveText} onObjectiveText={opt.setObjectiveText}
        objectiveDate={opt.objectiveDate} onObjectiveDate={opt.setObjectiveDate}
        weeklyGoalKm={opt.weeklyGoalKm} onWeeklyGoalKm={opt.setWeeklyGoalKm}
        availFamilies={filter.availFamilies} selectedFamilies={filter.selected} onToggleFamily={filter.toggleFamily}
        onAllFamilies={filter.resetFilters} allActive={filter.allActive}
        compareMode={opt.compareMode} onCompareMode={opt.setCompareMode} deltaLabel={cmp.typeCompare.label}
        comparePartial={opt.compareMode !== 'off' && cmp.typeCompare.partial} compareReason={cmp.typeCompare.reason}
        compareInProgress={opt.compareMode !== 'off' && cmp.typeCompare.inProgress} compareAsOf={cmp.typeCompare.asOf}
        formatId={opt.formatId} onFormat={opt.setFormatId}
        title={opt.title} onTitle={opt.setTitle} handle={opt.handle} onHandle={opt.setHandle}
        backgrounds={BACKGROUNDS} bgId={opt.bgId} onBg={opt.chooseBg}
        accents={ACCENTS} accentId={opt.accentId} onAccent={opt.setAccentId}
        theme={opt.theme} onTheme={opt.setTheme}
        privacy={opt.privacy} onPrivacy={opt.setPrivacy}
        showHeatmap={opt.showHeatmap} onHeatmap={opt.setShowHeatmap}
        spotChips={sp.chips} spotIndex={sp.index} onSpotSelect={sp.setIndex} spotCount={sp.count}
        photo={opt.photo} onPhoto={opt.choosePhoto} onClearPhoto={opt.clearPhoto}
        scrim={opt.scrim} onScrim={opt.setScrim}
        onExport={exp.handleExport} exporting={exp.exporting} onShare={exp.handleShare} canShare={canShare}
        onCopy={exp.handleCopy} canCopy={canCopy}
        onShareLink={handleShareLink}
        onPlayRecap={recapSlides.length > 1 ? () => setShowRecap(true) : null}
      />

      <div className="stage-wrap" ref={exp.wrapRef}>
        <div className="stage" style={{ transform: `scale(${exp.scale})` }}>
          {isPoster(opt.formatId) ? (
            <PosterCard
              ref={exp.cardRef}
              activities={filter.filteredActivities}
              summary={summary}
              title={resolvedTitle}
              handle={opt.handle.trim()}
              periodLabel={per.periodLabel}
              background={opt.background}
              photo={opt.photo}
              scrim={opt.scrim}
              accent={opt.accent}
              theme={opt.theme}
              privacy={opt.privacy}
            />
          ) : per.period === 'week' ? (
            <WeeklyCard
              ref={exp.cardRef}
              summary={summary}
              formatId={opt.formatId}
              background={opt.background}
              photo={opt.photo}
              periodLabel={per.periodLabel}
              scrim={opt.scrim}
              accent={opt.accent}
              theme={opt.theme}
              title={resolvedTitle}
              handle={opt.handle.trim()}
              perDay={weekPerDay}
              perDayByType={weekByType}
              sports={summary.byType}
              event={weekEvent}
              goal={weekGoalKm}
              todayIdx={weekTodayIdx}
              still={exp.capturing}
            />
          ) : (
            <StoryCard
              ref={exp.cardRef}
              summary={cardSummary}
              formatId={opt.formatId}
              background={opt.background}
              photo={opt.photo}
              periodLabel={per.periodLabel}
              scrim={opt.scrim}
              accent={opt.accent}
              theme={opt.theme}
              title={resolvedTitle}
              handle={opt.handle.trim()}
              spot={spot}
              privacy={opt.privacy}
              comparison={cmp.comparison}
              showDeltas={cmp.deltaActive}
              typeCompare={cmp.typeCompare}
              showHeatmap={opt.showHeatmap}
              heatmap={heatmap}
              still={exp.capturing}
            />
          )}
        </div>
      </div>

      {exp.toast && <div className="toast">{exp.toast.type === 'ok' ? '✅' : '⚠️'} {exp.toast.msg}</div>}

      {showRecap && (
        <RecapPlayer
          slides={recapSlides}
          acc={opt.accent}
          theme={opt.theme}
          background={opt.background}
          photo={opt.photo}
          periodLabel={per.periodLabel}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  )
}
