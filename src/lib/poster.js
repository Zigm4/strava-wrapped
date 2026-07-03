// Poster "mosaïque de tracés" : logique pure (sélection des tracés + calcul de la grille).
// Le rendu SVG est dans components/PosterCard.jsx.

import { familyKey, FAMILIES } from './activityTypes.js'
import { trimRoute } from './polyline.js'

// Prépare les tracés à afficher, dans l'ordre chronologique (raconte l'année).
// `max` borne le nombre de vignettes (échantillonnage régulier au-delà, pour garder
// la répartition sur la période). En mode privé on rogne les extrémités ; si le rognage
// vide un tracé (petite boucle près du domicile), on garde le tracé complet : à l'échelle
// d'une vignette on ne dessine ni départ ni arrivée, donc aucune adresse n'est lisible.
export function posterRoutes(activities, { privacy = true, max = 300 } = {}) {
  const withRoutes = activities.filter((a) => a.routePoints && a.routePoints.length > 1)
  const sorted = [...withRoutes].sort((a, b) =>
    String(a.start_date_local).localeCompare(String(b.start_date_local)),
  )
  let list = sorted
  let truncated = 0
  if (sorted.length > max) {
    const step = sorted.length / max
    list = Array.from({ length: max }, (_, i) => sorted[Math.floor(i * step)])
    truncated = sorted.length - max
  }
  const routes = list
    .map((a) => {
      const pts = privacy ? trimRoute(a.routePoints, 200) || a.routePoints : a.routePoints
      if (!pts || pts.length < 2) return null
      const k = familyKey(a.type)
      return { points: pts, family: k, color: FAMILIES[k]?.color || '#fc4c02', distance: a.distance || 0 }
    })
    .filter(Boolean)
  return { routes, total: withRoutes.length, truncated }
}

// Grille qui maximise la taille des cellules (carrées) pour `count` vignettes
// dans une zone W×H avec un espacement `gap`.
export function gridLayout(count, W, H, gap = 0) {
  if (count <= 0 || W <= 0 || H <= 0) return { cols: 0, rows: 0, size: 0 }
  let best = { cols: 1, rows: count, size: 0 }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const size = Math.min((W - (cols - 1) * gap) / cols, (H - (rows - 1) * gap) / rows)
    if (size > best.size) best = { cols, rows, size }
  }
  return best
}

// Familles présentes dans un jeu de tracés (pour la légende), dans l'ordre d'affichage.
export function posterFamilies(routes) {
  const present = new Set(routes.map((r) => r.family))
  return [...present].map((k) => ({ key: k, label: FAMILIES[k]?.label || k, color: FAMILIES[k]?.color || '#fc4c02' }))
}
