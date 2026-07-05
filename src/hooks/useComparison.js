import { useMemo } from 'react'
import { familyKey } from '../lib/activityTypes.js'
import { referencePeriod, computeComparison, computeTypeCompareRows, computeProgress } from '../lib/selectors.js'

// Comparaison vs période de référence (mois préc. / même mois an dernier), filtre respecté.
// Période en cours : on compare « à date » (référence tronquée au même jour) et on expose
// l'objectif « écart à combler » (référence complète). Seul un manque d'historique bloque.
export function useComparison({ activities, period, year, month, dataFloor, periodActivities, allActive, selected, compareMode }) {
  const refMode = compareMode === 'yoy' ? 'yoy' : 'prev'

  const comparison = useMemo(() => {
    const ref = referencePeriod({ activities, period, year, month, dataFloor }, refMode)
    if (ref.partial) return null
    const keep = (a) => allActive || selected.has(familyKey(a.type))
    // « à date » quand la période est en cours -> % honnête (pomme avec pomme)
    const cmp = computeComparison(periodActivities, ref.inProgress ? ref.prevActsToDate : ref.prevActs, keep)
    if (!cmp) return null
    const base = { ...cmp, label: ref.label }
    if (ref.inProgress) {
      base.inProgress = true
      base.asOf = ref.asOf
      base.progress = computeProgress(periodActivities, ref.prevActs, keep) // objectif = référence COMPLÈTE
    }
    return base
  }, [activities, period, year, month, dataFloor, refMode, periodActivities, allActive, selected])

  const typeCompare = useMemo(() => {
    const ref = referencePeriod({ activities, period, year, month, dataFloor }, refMode)
    const keepKey = (k) => allActive || selected.has(k)
    const rows = computeTypeCompareRows(periodActivities, ref.inProgress ? ref.prevActsToDate : ref.prevActs, keepKey)
    return { rows, label: ref.label, partial: ref.partial, reason: ref.reason, inProgress: ref.inProgress, asOf: ref.asOf }
  }, [activities, period, year, month, dataFloor, refMode, periodActivities, allActive, selected])

  const deltaActive = compareMode !== 'off' && !typeCompare.partial && typeCompare.rows.length > 0
  return { comparison, typeCompare, deltaActive }
}
