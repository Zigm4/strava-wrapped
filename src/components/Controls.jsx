import PeriodPanel from './controls/PeriodPanel.jsx'
import FilterPanel from './controls/FilterPanel.jsx'
import FormatPanel from './controls/FormatPanel.jsx'
import TextPanel from './controls/TextPanel.jsx'
import AppearancePanel from './controls/AppearancePanel.jsx'
import ExportBar from './controls/ExportBar.jsx'

// Colonne de réglages : assemble les panneaux. Interface (props) inchangée pour Studio.
export default function Controls({
  period, onPeriod,
  months, selectedMonthKey, onSelectMonth,
  monthViewYear, onPrevYear, onNextYear, canPrevYear, canNextYear,
  years, selectedYear, onSelectYear,
  availFamilies, selectedFamilies, onToggleFamily, onAllFamilies, allActive,
  compareMode, onCompareMode, deltaLabel, comparePartial, compareReason, compareInProgress, compareAsOf,
  formatId, onFormat,
  title, onTitle, handle, onHandle,
  backgrounds, bgId, onBg,
  accents, accentId, onAccent,
  theme, onTheme,
  privacy, onPrivacy,
  showHeatmap, onHeatmap,
  spotChips, spotIndex, onSpotSelect, spotCount,
  photo, onPhoto, onClearPhoto,
  scrim, onScrim,
  onExport, exporting, onShare, canShare,
  onCopy, canCopy, onShareLink, onPlayRecap,
}) {
  return (
    <div className="controls-col">
      <PeriodPanel
        period={period} onPeriod={onPeriod}
        months={months} selectedMonthKey={selectedMonthKey} onSelectMonth={onSelectMonth}
        monthViewYear={monthViewYear} onPrevYear={onPrevYear} onNextYear={onNextYear}
        canPrevYear={canPrevYear} canNextYear={canNextYear}
        years={years} selectedYear={selectedYear} onSelectYear={onSelectYear}
      />
      <FilterPanel
        availFamilies={availFamilies} selectedFamilies={selectedFamilies} onToggleFamily={onToggleFamily}
        onAllFamilies={onAllFamilies} allActive={allActive}
        compareMode={compareMode} onCompareMode={onCompareMode} deltaLabel={deltaLabel}
        comparePartial={comparePartial} compareReason={compareReason}
        compareInProgress={compareInProgress} compareAsOf={compareAsOf}
        period={period} selectedYear={selectedYear}
      />
      <FormatPanel formatId={formatId} onFormat={onFormat} />
      <TextPanel title={title} onTitle={onTitle} handle={handle} onHandle={onHandle} />
      <AppearancePanel
        backgrounds={backgrounds} bgId={bgId} onBg={onBg}
        accents={accents} accentId={accentId} onAccent={onAccent}
        theme={theme} onTheme={onTheme}
        showHeatmap={showHeatmap} onHeatmap={onHeatmap}
        spotChips={spotChips} spotIndex={spotIndex} onSpotSelect={onSpotSelect} spotCount={spotCount}
        privacy={privacy} onPrivacy={onPrivacy}
        photo={photo} onPhoto={onPhoto} onClearPhoto={onClearPhoto}
        scrim={scrim} onScrim={onScrim}
      />
      <ExportBar
        onExport={onExport} exporting={exporting} onShare={onShare} canShare={canShare}
        onCopy={onCopy} canCopy={canCopy} onShareLink={onShareLink} onPlayRecap={onPlayRecap}
      />
    </div>
  )
}
