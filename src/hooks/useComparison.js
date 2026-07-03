import { useMemo } from 'react'
import { familyKey } from '../lib/activityTypes.js'
import { referencePeriod, computeComparison, computeTypeCompareRows } from '../lib/selectors.js'

// Comparaison vs période de référence (mois préc. / même mois an dernier), filtre respecté.
export function useComparison({ activities, period, year, month, dataFloor, periodActivities, allActive, selected, compareMode }) {
  const refMode = compareMode === 'yoy' ? 'yoy' : 'prev'

  const comparison = useMemo(() => {
    const ref = referencePeriod({ activities, period, year, month, dataFloor }, refMode)
    if (ref.partial) return null
    const keep = (a) => allActive || selected.has(familyKey(a.type))
    const cmp = computeComparison(periodActivities, ref.prevActs, keep)
    return cmp ? { ...cmp, label: ref.label } : null
  }, [activities, period, year, month, dataFloor, refMode, periodActivities, allActive, selected])

  const typeCompare = useMemo(() => {
    const ref = referencePeriod({ activities, period, year, month, dataFloor }, refMode)
    const keepKey = (k) => allActive || selected.has(k)
    const rows = computeTypeCompareRows(periodActivities, ref.prevActs, keepKey)
    return { rows, label: ref.label, partial: ref.partial, reason: ref.reason }
  }, [activities, period, year, month, dataFloor, refMode, periodActivities, allActive, selected])

  const deltaActive = compareMode !== 'off' && !typeCompare.partial && typeCompare.rows.length > 0
  return { comparison, typeCompare, deltaActive }
}
