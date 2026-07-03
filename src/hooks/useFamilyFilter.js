import { useMemo, useState } from 'react'
import { availableFamilies } from '../lib/aggregate.js'
import { familyKey } from '../lib/activityTypes.js'

// Filtre par famille de sport : "tout" ou un sous-ensemble, + activités filtrées.
export function useFamilyFilter(periodActivities) {
  const [allActive, setAllActive] = useState(true)
  const [selected, setSelected] = useState(new Set())

  const availFamilies = useMemo(() => availableFamilies(periodActivities), [periodActivities])
  const filteredActivities = useMemo(
    () => (allActive ? periodActivities : periodActivities.filter((a) => selected.has(familyKey(a.type)))),
    [periodActivities, allActive, selected],
  )

  function resetFilters() { setAllActive(true); setSelected(new Set()) }
  function toggleFamily(k) {
    setSelected((prev) => {
      const next = new Set(allActive ? [] : prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      if (next.size === 0) { setAllActive(true); return new Set() }
      setAllActive(false)
      return next
    })
  }

  return { allActive, selected, availFamilies, filteredActivities, resetFilters, toggleFamily }
}
