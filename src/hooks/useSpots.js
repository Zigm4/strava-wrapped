import { useEffect, useMemo, useState } from 'react'
import { reverseGeocode } from '../lib/geocode.js'
import { fmtKm } from '../lib/format.js'

// Spots favoris de la période : la liste ordonnée vient de summary.spots (aggregate).
// Ce hook possède la SÉLECTION (quel spot afficher) et géocode chaque candidat pour
// libeller le picker. En démo, les villes intégrées suffisent -> aucun réseau.
// Renvoie { index, setIndex, count, chips, spot } où `spot` a la forme attendue par la carte
// (name/region/count/distance/elevation/type) + `route` pour piloter la mini-carte.
export function useSpots(summary, { isDemo, capturing }) {
  // identité stable tant que summary ne change pas -> pas de churn des memos en aval
  const spots = useMemo(
    () => (summary.spots && summary.spots.length
      ? summary.spots
      : (summary.favoriteSpot ? [summary.favoriteSpot] : [])),
    [summary],
  )
  const [index, setIndex] = useState(0)
  const [geos, setGeos] = useState([]) // parallèle à spots : undefined=en cours, objet|null=résolu

  // nouvelle période/filtre -> nouveau summary -> on revient au spot le plus dense
  useEffect(() => { setIndex(0) }, [summary])

  // géocode chaque spot (données réelles seulement), échelonné (~1 req/s côté geocode.js),
  // index 0 en premier pour que le libellé par défaut de la carte se résolve au plus vite.
  useEffect(() => {
    if (isDemo || !spots.length) { setGeos([]); return }
    let cancelled = false
    setGeos(new Array(spots.length).fill(undefined))
    const timers = spots.map((s, i) => {
      const lat = s.latlng?.[0], lng = s.latlng?.[1]
      if (lat == null) return null
      return setTimeout(() => {
        reverseGeocode(lat, lng).then((r) => {
          if (cancelled) return
          setGeos((prev) => { const next = prev.slice(); next[i] = r; return next })
        })
      }, i * 350)
    })
    return () => { cancelled = true; timers.forEach((t) => t && clearTimeout(t)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, summary])

  const safeIndex = Math.min(index, Math.max(0, spots.length - 1))

  // ville géocodée d'un spot (sans le placeholder "Localisation…") -> sert la sous-ligne.
  const cityOf = (i) => {
    const fs = spots[i]
    return (isDemo ? fs.city : (geos[i]?.city || fs.city)) || null
  }
  const regionPartsOf = (i) => {
    const fs = spots[i]
    return (isDemo ? [fs.state, fs.country] : [geos[i]?.region, geos[i]?.country]).filter(Boolean)
  }
  // TITRE affiché d'un spot : titre de la sortie si le spot n'a qu'une activité (plus parlant),
  // sinon la ville. Pendant une capture PNG on n'écrit jamais "Localisation…" dans l'image.
  const headlineOf = (i, fallback) => {
    const fs = spots[i]
    if (fs.title) return fs.title
    if (isDemo) return cityOf(i) || fallback
    if (geos[i] === undefined && !capturing) return 'Localisation…'
    return cityOf(i) || fallback
  }

  // dépend UNIQUEMENT du géocodage du spot sélectionné : la résolution d'un AUTRE spot
  // ne doit pas recréer cet objet (sinon la carte se recadre à chaque libellé qui arrive).
  const selGeo = geos[safeIndex]
  const spot = useMemo(() => {
    if (!spots.length) return null
    const fs = spots[safeIndex]
    // spot à une seule sortie : le titre est en tête -> on remet le lieu (ville · région) en sous-ligne
    const region = fs.title
      ? [cityOf(safeIndex), ...regionPartsOf(safeIndex)].filter(Boolean).join(' · ') || null
      : regionPartsOf(safeIndex).join(' · ') || null
    return {
      name: headlineOf(safeIndex, 'Ton terrain de jeu'),
      region,
      count: fs.count,
      distance: fs.distance,
      elevation: fs.elevation,
      type: fs.topType,
      route: fs.route || null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, safeIndex, selGeo, isDemo, capturing])

  const chips = useMemo(() => spots.map((s, i) => ({
    label: headlineOf(i, `Spot ${i + 1}`),
    sub: `${s.count} sortie${s.count > 1 ? 's' : ''} · ${fmtKm(s.distance, { decimals: 0 })} km`,
    type: s.topType,
  })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [spots, geos, isDemo, capturing])

  return { index: safeIndex, setIndex, count: spots.length, chips, spot }
}
