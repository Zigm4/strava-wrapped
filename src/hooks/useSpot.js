import { useEffect, useState } from 'react'
import { reverseGeocode } from '../lib/geocode.js'

// Spot favori : on géocode le point GPS réel pour les VRAIES données (le champ "ville" de
// Strava est souvent périmé). En démo, les villes intégrées sont justes -> pas de réseau.
export function useSpot(summary, { isDemo, capturing }) {
  const [geo, setGeo] = useState(null)
  const [geoPending, setGeoPending] = useState(false)
  const fs = summary.favoriteSpot
  const spotLat = fs?.latlng?.[0]
  const spotLng = fs?.latlng?.[1]

  useEffect(() => {
    if (isDemo || fs == null || spotLat == null) { setGeo(null); setGeoPending(false); return }
    let cancelled = false
    setGeoPending(true)
    reverseGeocode(spotLat, spotLng).then((r) => { if (!cancelled) { setGeo(r); setGeoPending(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, spotLat, spotLng])

  if (!fs) return null
  return {
    // pendant une capture PNG, on n'écrit jamais le placeholder "Localisation…" dans l'image
    name: isDemo
      ? (fs.city || 'Ton terrain de jeu')
      : (geo?.city || (geoPending && !capturing ? 'Localisation…' : (fs.city || 'Ton terrain de jeu'))),
    region: (isDemo ? [fs.state, fs.country] : [geo?.region, geo?.country]).filter(Boolean).join(' · ') || null,
    count: fs.count,
    distance: fs.distance,
    elevation: fs.elevation,
    type: fs.topType,
  }
}
