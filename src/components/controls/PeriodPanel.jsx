import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'

export default function PeriodPanel({
  period, onPeriod,
  months, selectedMonthKey, onSelectMonth,
  monthViewYear, onPrevYear, onNextYear, canPrevYear, canNextYear,
  years, selectedYear, onSelectYear,
  weeks, selectedWeekKey, onSelectWeek,
}) {
  return (
    <div className="panel">
      <h3><CalendarRange size={15} /> Période</h3>
      <div className="segment" style={{ marginBottom: 14 }}>
        <button className={period === 'week' ? 'active' : ''} onClick={() => onPeriod('week')}>Semaine</button>
        <button className={period === 'month' ? 'active' : ''} onClick={() => onPeriod('month')}>Mois</button>
        <button className={period === 'year' ? 'active' : ''} onClick={() => onPeriod('year')}>Année</button>
      </div>
      {period === 'week' ? (
        <div className="weeks">
          {weeks.map((w) => (
            <button
              key={w.key}
              className={`week-chip ${w.key === selectedWeekKey ? 'active' : ''} ${w.count === 0 ? 'empty' : ''} ${w.outOfRange ? 'out-of-range' : ''}`}
              disabled={w.outOfRange}
              title={w.outOfRange ? 'Hors de l\'historique téléchargé (5 ans)' : undefined}
              onClick={() => onSelectWeek(w)}
            >
              <span className="wk-range">{w.label}</span>
              <span className="wk-count">{w.outOfRange ? '—' : w.count > 0 ? `${w.count} act.` : '-'}</span>
            </button>
          ))}
        </div>
      ) : period === 'month' ? (
        <>
          <div className="year-nav">
            <button className="ynav-btn" disabled={!canPrevYear} onClick={onPrevYear} aria-label="Année précédente"><ChevronLeft size={18} /></button>
            <span>{monthViewYear}</span>
            <button className="ynav-btn" disabled={!canNextYear} onClick={onNextYear} aria-label="Année suivante"><ChevronRight size={18} /></button>
          </div>
          <div className="months months-12">
            {months.map((m) => (
              <button
                key={m.key}
                className={`month-chip ${m.key === selectedMonthKey ? 'active' : ''} ${m.count === 0 ? 'empty' : ''} ${m.outOfRange ? 'out-of-range' : ''}`}
                disabled={m.outOfRange}
                title={m.outOfRange ? 'Hors de l\'historique téléchargé (5 ans)' : undefined}
                onClick={() => onSelectMonth(m)}
              >
                <div className="m">{m.short}</div>
                <div className="y">{m.outOfRange ? '—' : m.count > 0 ? `${m.count} act.` : '-'}</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="months" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {years.map((y) => (
            <button key={y.year} className={`month-chip ${y.year === selectedYear ? 'active' : ''}`} onClick={() => onSelectYear(y.year)}>
              <div className="m">{y.year}</div>
              <div className="y">{y.count} act.</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
