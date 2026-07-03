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

  // nom de lieu d'un spot : démo -> ville intégrée ; réel -> géocodage (avec repli).
  // pendant une capture PNG on n'écrit jamais le placeholder "Localisation…" dans l'image.
  const placeName = (i, fallback) => {
    const fs = spots[i]
    if (isDemo) return fs.city || fallback
    const g = geos[i]
    if (g === undefined && !capturing) return 'Localisation…'
    return g?.city || fs.city || fallback
  }
  const regionOf = (i) => {
    const fs = spots[i]
    const parts = isDemo ? [fs.state, fs.country] : [geos[i]?.region, geos[i]?.country]
    return parts.filter(Boolean).join(' · ') || null
  }

  // dépend UNIQUEMENT du géocodage du spot sélectionné : la résolution d'un AUTRE spot
  // ne doit pas recréer cet objet (sinon la carte se recadre à chaque libellé qui arrive).
  const selGeo = geos[safeIndex]
  const spot = useMemo(() => {
    if (!spots.length) return null
    const fs = spots[safeIndex]
    return {
      name: placeName(safeIndex, 'Ton terrain de jeu'),
      region: regionOf(safeIndex),
      count: fs.count,
      distance: fs.distance,
      elevation: fs.elevation,
      type: fs.topType,
      route: fs.route || null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, safeIndex, selGeo, isDemo, capturing])

  const chips = useMemo(() => spots.map((s, i) => ({
    label: placeName(i, `Spot ${i + 1}`),
    sub: `${s.count} sortie${s.count > 1 ? 's' : ''} · ${fmtKm(s.distance, { decimals: 0 })} km`,
    type: s.topType,
  })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [spots, geos, isDemo, capturing])

  return { index: safeIndex, setIndex, count: spots.length, chips, spot }
}
