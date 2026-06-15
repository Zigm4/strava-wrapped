import { useMemo } from 'react'
import { normalizeRoutes, pointsToPath } from '../lib/polyline.js'

// Dessine un seul tracé GPS, centré et bien lisible dans un carré `size`.
export default function RouteMap({ route, size, accentFrom = '#fc4c02', accentTo = '#ff2d6f', gradId = 'routeAcc' }) {
  const norm = useMemo(() => normalizeRoutes(route ? [route] : [], size, size, size * 0.12)[0], [route, size])
  if (!norm || norm.length < 2) return null

  const start = norm[0]
  const end = norm[norm.length - 1]
  const sw = Math.max(4, size * 0.026)
  const dot = Math.max(5, size * 0.04)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accentFrom} />
          <stop offset="1" stopColor={accentTo} />
        </linearGradient>
      </defs>
      {/* ombre douce du tracé pour le détacher du fond */}
      <path d={pointsToPath(norm)} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={sw + 4}
        strokeLinecap="round" strokeLinejoin="round" transform="translate(0,2)" />
      <path d={pointsToPath(norm)} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start[0]} cy={start[1]} r={dot} fill={accentFrom} stroke="#fff" strokeWidth={dot * 0.32} />
      <circle cx={end[0]} cy={end[1]} r={dot * 0.7} fill="#fff" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
    </svg>
  )
}
