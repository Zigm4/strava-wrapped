import { forwardRef, useRef, useState, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Mountain, Timer, CalendarDays, Award } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber.jsx'
import RouteMap from './RouteMap.jsx'
import Heatmap from './Heatmap.jsx'
import { FamilyIcon } from './icons.jsx'
import { FAMILIES } from '../lib/activityTypes.js'
import { trimRoute } from '../lib/polyline.js'
import { FORMATS } from '../data/formats.js'
import { fmtKm, fmtElev, fmtHours, fmtInt, fmtPace, fmtSpeed, fmtDuration } from '../lib/format.js'
import { DENSITY, buildHighlights, buildRecords, deltaText, deltaElevText } from '../lib/cardContent.js'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } }
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const StoryCard = forwardRef(function StoryCard(
  { summary, formatId = 'story', background, photo, periodLabel, scrim, accent, theme = 'dark', title, handle, spot, privacy = true, comparison, showDeltas, typeCompare, showHeatmap, heatmap, still = false },
  ref,
) {
  const fmt = FORMATS[formatId] || FORMATS.story
  const d = DENSITY[formatId] || DENSITY.story
  const padPx = formatId === 'square' ? 56 : 64
  const scrimVal = scrim != null ? scrim : photo ? 0.7 : background?.scrim ?? 0.5
  const acc = accent || { from: '#fc4c02', to: '#ff2d6f' }

  // Ajustement d'échelle : si le contenu dépasse le canevas (formats courts Post/Carré),
  // on le réduit juste ce qu'il faut pour qu'AUCUN bloc ne soit rogné par la bordure.
  // Garantie universelle, quel que soit le format ou la quantité de données.
  const bodyRef = useRef(null)
  const [fit, setFit] = useState(1)
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => {
      const avail = el.clientHeight
      const need = el.scrollHeight
      setFit(need > avail + 2 ? Math.max(0.6, avail / need) : 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, summary, showDeltas, showHeatmap, spot, privacy, comparison, typeCompare])

  const rootStyle = {
    width: fmt.w,
    height: fmt.h,
    '--scrim': scrimVal,
    '--pad': `${padPx}px`,
    '--acc-from': acc.from,
    '--acc-to': acc.to,
  }

  const Bg = () => (photo ? <img src={photo} alt="" /> : <div style={{ width: '100%', height: '100%', background: background?.css }} />)

  if (!summary || summary.count === 0) {
    return (
      <div ref={ref} className="card empty" style={rootStyle} data-theme={theme}>
        <div className="bg-layer"><Bg /></div>
        <div className="scrim" />
        <div className="grain-c" />
        <div className="content">
          <div className="big">Aucune activité</div>
          <p>Pas de sortie sur cette période pour les types sélectionnés. Change de période ou de filtre 👟</p>
        </div>
      </div>
    )
  }

  const distTypes = summary.byType.filter((t) => t.distance > 0)
  const maxTypeDist = Math.max(...distTypes.map((t) => t.distance), 1)
  const types = distTypes.slice(0, d.types)
  const deltaMode = showDeltas && typeCompare?.rows?.length > 0
  const typeRows = deltaMode
    ? typeCompare.rows.filter((t) => t.current > 0 || t.previous > 0).slice(0, d.types)
    : types
  const maxRow = deltaMode ? Math.max(...typeRows.map((t) => t.current), 1) : maxTypeDist
  const records = d.showRecords ? buildRecords(summary, d.records) : []
  const races = (summary.races || []).slice(0, d.races || 0)
  const showRaces = races.length > 0
  const showRecordsGrid = d.showRecords && records.length > 0 && !showRaces
  const route = privacy ? trimRoute(summary.heroRoute, 300) : summary.heroRoute
  const hasMap = d.showMap && route && route.length > 1
  // Le calendrier prend la place de la mini-carte (formats qui ont de la place : story/post)
  const showCal = showHeatmap && d.showMap && heatmap
  const highlights = buildHighlights(summary, comparison, d.highlights || 0)

  return (
    <div ref={ref} className="card" style={rootStyle} data-theme={theme}>
      <div className="bg-layer"><Bg /></div>
      <div className="scrim" />
      <div className="grain-c" />

      <motion.div className="content" variants={container} initial={still ? 'show' : 'hidden'} animate="show">
        {/* header */}
        <motion.div className="c-head" variants={item}>
          <div className="who">
            <div className="badge"><span className="strava-dot" />{title}</div>
            {handle ? <div className="handle">{handle}</div> : null}
          </div>
          <div className="month">{periodLabel}</div>
        </motion.div>

        <div className="c-body" ref={bodyRef} style={fit < 1 ? { transform: `scale(${fit})`, transformOrigin: 'top center' } : undefined}>
        {/* hero */}
        <motion.div className="hero" variants={item}>
          <div className="label">Distance parcourue</div>
          <div className="value">
            <AnimatedNumber value={summary.totalDistance} format={(v) => fmtKm(v)} still={still} />
            <span className="unit">km</span>
          </div>
          <div className="accent-bar" />
          <div className="label" style={{ fontSize: 26, marginTop: 8 }}>
            {fmtInt(summary.count)} sorties · {summary.activeDays} jours actifs
          </div>
        </motion.div>

        {/* faits marquants */}
        {highlights.length > 0 && (
          <motion.div className="highlights" variants={item}>
            {highlights.map((h, i) => {
              const Ico = h.icon
              return <span className="hl-chip" key={i}><Ico size={20} />{h.text}</span>
            })}
          </motion.div>
        )}

        {/* KPIs */}
        <motion.div className="stat-row" variants={item}>
          <div className="stat">
            <div className="s-ico"><Mountain size={30} /></div>
            <div className="s-val"><AnimatedNumber value={summary.totalElevation} format={fmtElev} still={still} /><span className="u">m</span></div>
            <div className="s-lbl">Dénivelé +</div>
          </div>
          <div className="stat">
            <div className="s-ico"><Timer size={30} /></div>
            <div className="s-val"><AnimatedNumber value={summary.totalMovingTime} format={fmtHours} still={still} /><span className="u">h</span></div>
            <div className="s-lbl">En mouvement</div>
          </div>
          <div className="stat">
            <div className="s-ico"><Award size={30} /></div>
            <div className="s-val"><AnimatedNumber value={summary.achievements || summary.kudos} format={fmtInt} still={still} /></div>
            <div className="s-lbl">{summary.achievements ? 'Trophées' : 'Kudos'}</div>
          </div>
        </motion.div>

        {/* répartition par type (ou écart vs période précédente) */}
        {d.showTypes && typeRows.length > 0 && (
          <motion.div className="types" variants={item}>
            {deltaMode && <div className="sec-label">Écart vs {typeCompare.label}</div>}
            {typeRows.map((t) => {
              const dist = deltaMode ? t.current : t.distance
              return (
                <div className="trow" key={t.key}>
                  <div className="ticon" style={{ background: `${t.color}33` }}>
                    <FamilyIcon k={t.key} size={32} style={{ color: t.color }} />
                  </div>
                  <div className="tmeta">
                    <div className="tname"><span>{t.label}</span><span className="tdist">{fmtKm(dist)} km</span></div>
                    <div className="tbar"><div className="tfill" style={{ width: `${dist > 0 ? Math.max(6, (dist / maxRow) * 100) : 0}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}aa)` }} /></div>
                    {deltaMode ? (
                      <div className="tsub tdelta-line">
                        <span className={`d ${t.delta > 100 ? 'up' : t.delta < -100 ? 'down' : ''}`}>{deltaText(t.delta)}</span>
                        <span className="dsep"> · </span>
                        <span className={`d ${t.deltaElev > 10 ? 'up' : t.deltaElev < -10 ? 'down' : ''}`}>{deltaElevText(t.deltaElev)}</span>
                      </div>
                    ) : (
                      <div className="tsub">{t.count} sorties · {fmtElev(t.elevation)} m D+</div>
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* compétitions (sorties taguées "Race" sur Strava) */}
        {showRaces && (
          <motion.div className="races" variants={item}>
            <div className="sec-label">Compétitions</div>
            {races.map((r, i) => (
              <div className="race" key={i}>
                <div className="race-ico" style={{ background: `${FAMILIES[r.family]?.color || '#fc4c02'}33` }}>
                  <FamilyIcon k={r.family} size={26} style={{ color: FAMILIES[r.family]?.color }} />
                </div>
                <div className="race-body">
                  <div className="race-top">
                    <span className="race-name">{r.name}</span>
                    {r.isRecord && <span className="race-flag"><Award size={15} /> Record</span>}
                  </div>
                  <div className="race-stats">
                    {fmtKm(r.distance)} km · {fmtDuration(r.time)} · {r.family === 'ride' ? `${fmtSpeed(r.speed)} km/h` : `${fmtPace(r.speed)} /km`}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* records génériques (quand il n'y a pas de compétitions) */}
        {showRecordsGrid && (
          <motion.div className="records" variants={item}>
            {records.map((rec, i) => {
              const Ico = rec.icon
              return (
                <div className="rec" key={i}>
                  <div className="r-ico"><Ico size={28} color="#fff" /></div>
                  <div>
                    <div className="r-lbl">{rec.label}</div>
                    <div className="r-val">{rec.value}{rec.unit ? <span style={{ fontSize: 20, fontWeight: 600, opacity: 0.7 }}> {rec.unit}</span> : null}</div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* calendrier jour-par-jour (remplace la mini-carte quand activé) */}
        {showCal ? (
          <motion.div className="c-cal" variants={item}>
            <div className="sec-label">
              <CalendarDays size={20} style={{ verticalAlign: '-3px' }} /> {heatmap.type === 'year' ? 'Ton année, jour par jour' : 'Ton mois, jour par jour'}
            </div>
            <Heatmap data={heatmap} accent={acc.from} />
            <div className="cal-legend">
              <span>moins</span>
              <span className="cal-swatches">
                {[0.1, 0.32, 0.5, 0.72, 1].map((o, i) => (
                  <i key={i} style={{ background: i === 0 ? 'rgba(255,255,255,0.12)' : acc.from, opacity: i === 0 ? 1 : o }} />
                ))}
              </span>
              <span>plus</span>
              <span className="cal-powered">Propulsé par <b>Strava</b>{handle ? ` · ${handle}` : ''}</span>
            </div>
          </motion.div>
        ) : hasMap ? (
          <motion.div className="c-map" variants={item}>
            <div className="map-tile" style={{ width: d.mapH, minHeight: d.mapH }}>
              <RouteMap route={route} size={d.mapH} accentFrom={acc.from} accentTo={acc.to} />
            </div>
            <div className="map-info">
              <div className="s-lbl"><MapPin size={20} style={{ verticalAlign: '-3px' }} /> Spot favori</div>
              <div className="s-name">{spot ? spot.name : 'Ton terrain de jeu'}</div>
              {spot?.region ? <div className="map-region">{spot.region}</div> : null}
              {spot?.type && FAMILIES[spot.type] ? (
                <div className="map-type">
                  <FamilyIcon k={spot.type} size={20} style={{ color: FAMILIES[spot.type].color }} />
                  {FAMILIES[spot.type].label}
                </div>
              ) : null}
              {spot ? (
                <div className="map-sub">
                  {spot.count} sortie{spot.count > 1 ? 's' : ''} · {fmtKm(spot.distance)} km
                  {spot.elevation > 200 ? ` · ${fmtElev(spot.elevation)} m D+` : ''}
                </div>
              ) : null}
              <div className="powered map-powered">Propulsé par <b>Strava</b>{handle ? ` · ${handle}` : ''}</div>
            </div>
          </motion.div>
        ) : (
          <motion.div className="c-foot" variants={item}>
            <div className="spot">
              <div className="pin"><MapPin size={26} /></div>
              <div>
                <div className="s-lbl">{spot ? 'Spot favori' : 'Plus longue série'}</div>
                <div className="s-name">{spot ? spot.name : `${summary.streak} jours`}</div>
              </div>
            </div>
            <div className="powered">Propulsé par <b>Strava</b><br />{handle || 'rewind'}</div>
          </motion.div>
        )}
        </div>
      </motion.div>
    </div>
  )
})

export default StoryCard
