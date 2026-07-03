import { useMemo, useState } from 'react'
import { buildYears, buildMonthsForYear, mostRecentMonth, makeMonth, periodActivitiesOf } from '../lib/selectors.js'

// État de période (mois/année) + dérivations (années, mois, activités de la période).
export function usePeriod(activities, dataFloor) {
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

  const periodActivities = useMemo(() => periodActivitiesOf(activities, period, year, month), [activities, period, year, month])
  const periodLabel = period === 'year' ? String(year) : month.label

  return {
    period, year, month, monthViewYear, years, months, minYear, maxYear,
    periodActivities, periodLabel,
    canPrevYear: monthViewYear > minYear, canNextYear: monthViewYear < maxYear,
    setPeriod, setYear, setMonth,
    prevMonthYear: () => setMonthViewYear((y) => Math.max(minYear, y - 1)),
    nextMonthYear: () => setMonthViewYear((y) => Math.min(maxYear, y + 1)),
  }
}
