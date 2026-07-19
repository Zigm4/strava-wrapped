import { useMemo, useState } from 'react'
import { buildYears, buildMonthsForYear, mostRecentMonth, makeMonth, periodActivitiesOf, buildWeeks, mostRecentWeek, makeWeek } from '../lib/selectors.js'

// État de période (semaine/mois/année) + dérivations (années, mois, semaines, activités).
export function usePeriod(activities, dataFloor) {
  const years = useMemo(() => buildYears(activities), [activities])
  const mr = useMemo(() => mostRecentMonth(activities), [activities])
  const wr = useMemo(() => mostRecentWeek(activities), [activities])
  const nowYear = new Date().getFullYear()
  const yearList = years.map((y) => y.year)
  const minYear = Math.min(nowYear, ...yearList)
  const maxYear = Math.max(nowYear, ...yearList)

  const [period, setPeriod] = useState('month')
  const [year, setYear] = useState(() => years[0].year)
  const [monthViewYear, setMonthViewYear] = useState(mr.year)
  const [month, setMonth] = useState(() => makeMonth(mr.year, mr.month, 0))
  const [week, setWeek] = useState(() => makeWeek(wr.mondayOrdinal, 0, dataFloor))
  const months = useMemo(() => buildMonthsForYear(activities, monthViewYear, dataFloor), [activities, monthViewYear, dataFloor])
  const weeks = useMemo(() => buildWeeks(activities, dataFloor, 12), [activities, dataFloor])

  const periodActivities = useMemo(() => periodActivitiesOf(activities, period, year, month, week), [activities, period, year, month, week])
  const periodLabel = period === 'year' ? String(year) : period === 'week' ? week.label : month.label

  return {
    period, year, month, week, monthViewYear, years, months, weeks, minYear, maxYear,
    periodActivities, periodLabel,
    canPrevYear: monthViewYear > minYear, canNextYear: monthViewYear < maxYear,
    setPeriod, setYear, setMonth, setWeek,
    prevMonthYear: () => setMonthViewYear((y) => Math.max(minYear, y - 1)),
    nextMonthYear: () => setMonthViewYear((y) => Math.min(maxYear, y + 1)),
  }
}
