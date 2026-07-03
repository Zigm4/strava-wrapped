import { intensity } from '../lib/heatmap.js'

// Heatmap calendrier en SVG (rendu net à l'export). `data` vient de monthHeatmap/yearHeatmap.
// Mois : 7 colonnes (jours) × N semaines. Année : ~53 colonnes (semaines) × 7 jours.
export default function Heatmap({ data, accent = '#fc4c02' }) {
  if (!data) return null
  const isYear = data.type === 'year'
  const weeks = isYear ? data.columns : data.weeks
  const CELL = 10, GAP = 2.4, STEP = CELL + GAP

  const cols = isYear ? weeks.length : 7
  const rows = isYear ? 7 : weeks.length
  const W = cols * STEP - GAP
  const H = rows * STEP - GAP

  // niveaux d'opacité (0 = piste, 1..4 = intensité croissante de l'accent)
  const fillFor = (cell) => {
    if (!cell || !cell.value) return { fill: 'currentColor', opacity: 0.1 }
    const lvl = intensity(cell.value, data.max)
    return { fill: accent, opacity: [0.1, 0.32, 0.5, 0.72, 1][lvl] }
  }

  const rects = []
  weeks.forEach((week, wi) => {
    week.forEach((cell, di) => {
      if (isYear && !cell) return
      const x = (isYear ? wi : di) * STEP
      const y = (isYear ? di : wi) * STEP
      const { fill, opacity } = fillFor(cell)
      rects.push(
        <rect key={`${wi}-${di}`} x={x} y={y} width={CELL} height={CELL} rx={2.4}
          fill={fill} opacity={cell ? opacity : 0.06} />,
      )
    })
  })

  // Année : grille large (53 col.) qui remplit la largeur. Mois : seulement 7 colonnes,
  // donc on borne la largeur pour garder des carrés fins et élégants (sinon ils s'étirent).
  const svgStyle = isYear
    ? { display: 'block', width: '100%', color: '#fff' }
    : { display: 'block', width: 360, maxWidth: '100%', color: '#fff' }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle} preserveAspectRatio="xMidYMid meet">
      {rects}
    </svg>
  )
}
