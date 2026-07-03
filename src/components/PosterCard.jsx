import { forwardRef, useMemo } from 'react'
import { MapPin } from 'lucide-react'
import { normalizeRoutes, pointsToPath } from '../lib/polyline.js'
import { posterRoutes, gridLayout, posterFamilies } from '../lib/poster.js'
import { FORMATS } from '../data/formats.js'
import { fmtKm, fmtElev, fmtInt } from '../lib/format.js'

// Poster "mosaïque" : tous les tracés de la période, alignés en grille, à encadrer.
const PosterCard = forwardRef(function PosterCard(
  { activities, summary, title, handle, periodLabel, background, photo, scrim, accent, theme = 'dark', privacy = true },
  ref,
) {
  const fmt = FORMATS.poster
  const padPx = 72
  const scrimVal = scrim != null ? scrim : photo ? 0.7 : background?.scrim ?? 0.4
  const acc = accent || { from: '#fc4c02', to: '#ff2d6f' }

  const rootStyle = {
    width: fmt.w,
    height: fmt.h,
    '--scrim': scrimVal,
    '--pad': `${padPx}px`,
    '--acc-from': acc.from,
    '--acc-to': acc.to,
  }

  const innerW = fmt.w - padPx * 2
  const headerH = 210
  const footerH = 208
  const gridH = fmt.h - padPx * 2 - headerH - footerH

  const model = useMemo(() => {
    const { routes, total, truncated } = posterRoutes(activities || [], { privacy, max: 300 })
    if (!routes.length) return { routes: [], cells: [], families: [], total, truncated }
    const gap = 12
    const { cols, rows, size } = gridLayout(routes.length, innerW, gridH, gap)
    const gw = cols * size + (cols - 1) * gap
    const gh = rows * size + (rows - 1) * gap
    const offX = (innerW - gw) / 2
    const offY = (gridH - gh) / 2
    const cells = routes.map((r, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const norm = normalizeRoutes([r.points], size, size, size * 0.18)[0]
      return {
        x: offX + col * (size + gap),
        y: offY + row * (size + gap),
        d: norm ? pointsToPath(norm) : '',
        color: r.color,
        // trait fin et élégant : proportionnel à la tuile mais plafonné (sinon "gras" sur grandes tuiles)
        sw: Math.max(1.2, Math.min(size * 0.038, 2.8)),
      }
    }).filter((c) => c.d)
    return { routes, cells, families: posterFamilies(routes), total, truncated, size }
  }, [activities, privacy, innerW, gridH])

  const Bg = () => (photo ? <img src={photo} alt="" /> : <div style={{ width: '100%', height: '100%', background: background?.css }} />)
  const light = theme === 'light'
  const tileFill = light ? 'rgba(0,0,0,0.045)' : 'rgba(255,255,255,0.07)'
  const tileStroke = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.11)'
  const heading = (title && title.trim()) || 'Mon année'
  const count = summary?.count || 0
  const km = fmtKm(summary?.totalDistance || 0, { decimals: 0 })

  return (
    <div ref={ref} className="card poster" style={rootStyle} data-theme={theme}>
      <div className="bg-layer"><Bg /></div>
      <div className="scrim" />
      <div className="grain-c" />

      <div className="content">
        <div className="poster-head" style={{ height: headerH }}>
          <div className="poster-title">
            <div className="badge"><span className="strava-dot" />{heading}</div>
            <div className="poster-period">{periodLabel}</div>
          </div>
          <div className="poster-sub">{fmtInt(count)} sorties · {km} km parcourus</div>
        </div>

        <div className="poster-grid" style={{ height: gridH }}>
          {model.cells.length > 0 ? (
            <svg width={innerW} height={gridH} viewBox={`0 0 ${innerW} ${gridH}`} style={{ display: 'block' }}>
              <defs>
                <linearGradient id="posterAcc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={acc.from} />
                  <stop offset="1" stopColor={acc.to} />
                </linearGradient>
              </defs>
              {model.cells.map((c, i) => (
                <g key={i} transform={`translate(${c.x.toFixed(1)}, ${c.y.toFixed(1)})`}>
                  <rect width={model.size} height={model.size} rx={model.size * 0.14}
                    fill={tileFill} stroke={tileStroke} strokeWidth="1" />
                  <path d={c.d} fill="none" stroke={c.color} strokeWidth={c.sw}
                    strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ))}
            </svg>
          ) : (
            <div className="poster-empty"><MapPin size={40} /><p>Pas de tracé GPS sur cette période.</p></div>
          )}
        </div>

        <div className="poster-foot" style={{ height: footerH }}>
          <div className="poster-legend">
            {model.families.map((f) => (
              <span className="pl-item" key={f.key}><i style={{ background: f.color }} />{f.label}</span>
            ))}
            {model.truncated > 0 && <span className="pl-note">+{model.truncated} autres tracés</span>}
          </div>
          <div className="poster-stats">
            <div className="ps"><b>{fmtInt(count)}</b><span>sorties</span></div>
            <div className="ps"><b>{km}</b><span>km</span></div>
            <div className="ps"><b>{fmtElev(summary?.totalElevation || 0)}</b><span>m D+</span></div>
            <div className="ps"><b>{summary?.activeDays || 0}</b><span>jours actifs</span></div>
          </div>
          <div className="powered poster-powered">Propulsé par <b>Strava</b>{handle ? ` · ${handle}` : ''}</div>
        </div>
      </div>
    </div>
  )
})

export default PosterCard
