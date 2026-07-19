import { forwardRef, useRef, useState, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Mountain, Timer, TrendingDown } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber.jsx'
import { FORMATS } from '../data/formats.js'
import { fmtKm, fmtElev, fmtHours, fmtInt, dayLabel } from '../lib/format.js'
import { daysUntil } from '../lib/date.js'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } }
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Carte récap HEBDOMADAIRE (lundi→dimanche), pensée pour un post Instagram.
// Distance de la semaine, D+/D-, graph des jours courus, et un objectif à deux volets :
// compte à rebours vers un événement (texte + date) + objectif de distance de la semaine.
const WeeklyCard = forwardRef(function WeeklyCard(
  { summary, formatId = 'story', background, photo, periodLabel, scrim, accent, theme = 'dark', title = 'Ma semaine', handle, perDay = [], event = null, goal = null, todayIdx = -1, still = false },
  ref,
) {
  const fmt = FORMATS[formatId] || FORMATS.story
  const padPx = formatId === 'square' ? 56 : 64
  const scrimVal = scrim != null ? scrim : photo ? 0.7 : background?.scrim ?? 0.5
  const acc = accent || { from: '#fc4c02', to: '#ff2d6f' }

  // même garantie que StoryCard : on réduit le corps si le contenu dépasse le canevas
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
  }, [formatId, summary, perDay, event, goal])

  const rootStyle = {
    width: fmt.w, height: fmt.h, '--scrim': scrimVal, '--pad': `${padPx}px`,
    '--acc-from': acc.from, '--acc-to': acc.to,
  }
  const Bg = () => (photo ? <img src={photo} alt="" /> : <div style={{ width: '100%', height: '100%', background: background?.css }} />)

  const week = Array.from({ length: 7 }, (_, i) => perDay[i] || 0)
  const maxDay = Math.max(...week, 1)
  let peakIdx = -1, leastIdx = -1
  for (let i = 0; i < 7; i++) {
    if (week[i] > 0 && week[i] >= maxDay && peakIdx === -1) peakIdx = i
    if (week[i] > 0 && (leastIdx === -1 || week[i] < week[leastIdx])) leastIdx = i
  }
  if (leastIdx === peakIdx) leastIdx = -1 // une seule sortie -> pas de "moins actif" distinct
  // étiquette d'un jour : km si couru (emoji sur le jour le plus / le moins actif), sinon repos.
  const dayTag = (i) => {
    if (week[i] <= 0) return '😴'
    const km = fmtKm(week[i])
    if (i === peakIdx) return `🔥 ${km}`
    if (i === leastIdx) return `🐢 ${km}`
    return km
  }
  const restWeek = !summary || summary.count === 0

  // objectif — volet événement (compte à rebours)
  const jx = event?.date ? daysUntil(event.date) : null
  const jxText = jx == null ? null : jx > 0 ? `J-${jx}` : jx === 0 ? 'Jour J' : `J+${-jx}`
  const eventDateLbl = event?.date ? `${dayLabel(event.date)} ${String(event.date).slice(0, 4)}` : null
  const hasEvent = !!(event && (event.name || event.date))

  // objectif — volet distance de la semaine
  const goalKm = goal > 0 ? goal : null
  const doneM = summary?.totalDistance || 0
  const goalM = goalKm ? goalKm * 1000 : 0
  const goalPct = goalKm ? Math.min(100, Math.round((doneM / goalM) * 100)) : 0
  const goalReached = goalKm && doneM >= goalM
  const remainM = goalKm ? Math.max(0, goalM - doneM) : 0
  const hasObj = hasEvent || goalKm

  return (
    <div ref={ref} className="card wk" style={rootStyle} data-theme={theme}>
      <div className="bg-layer"><Bg /></div>
      <div className="scrim" />
      <div className="grain-c" />

      <motion.div className="content" variants={container} initial={still ? 'show' : 'hidden'} animate="show">
        <motion.div className="c-head" variants={item}>
          <div className="who">
            <div className="badge"><span className="strava-dot" />{title} 🏃</div>
            {handle ? <div className="handle">{handle}</div> : null}
          </div>
          <div className="wk-range">
            <div className="wk-kicker">Semaine</div>
            <div className="wk-range-val">{periodLabel}</div>
          </div>
        </motion.div>

        <div className="c-body" ref={bodyRef} style={fit < 1 ? { transform: `scale(${fit})`, transformOrigin: 'top center' } : undefined}>
          {/* hero : distance de la semaine */}
          <motion.div className="hero" variants={item}>
            <div className="label">Distance de la semaine</div>
            <div className="value">
              <AnimatedNumber value={doneM} format={(v) => fmtKm(v)} still={still} />
              <span className="unit">km</span>
            </div>
            <div className="accent-bar" />
            <div className="label" style={{ fontSize: 26, marginTop: 8 }}>
              {fmtInt(summary?.count || 0)} sorties · {summary?.activeDays || 0} jours actifs
              {restWeek ? <span className="wk-rest-chip">Semaine de repos 😌</span> : null}
            </div>
          </motion.div>

          {/* KPIs : D+, D-, temps */}
          <motion.div className="stat-row" variants={item}>
            <div className="stat">
              <div className="s-ico"><Mountain size={30} /></div>
              <div className="s-val"><AnimatedNumber value={summary?.totalElevation || 0} format={fmtElev} still={still} /><span className="u">m</span></div>
              <div className="s-lbl">Dénivelé +</div>
            </div>
            <div className="stat">
              <div className="s-ico"><TrendingDown size={30} /></div>
              <div className="s-val"><AnimatedNumber value={summary?.totalElevationLoss || 0} format={fmtElev} still={still} /><span className="u">m</span></div>
              <div className="s-lbl">Dénivelé −</div>
            </div>
            <div className="stat">
              <div className="s-ico"><Timer size={30} /></div>
              <div className="s-val"><AnimatedNumber value={summary?.totalMovingTime || 0} format={fmtHours} still={still} /><span className="u">h</span></div>
              <div className="s-lbl">En mouvement</div>
            </div>
          </motion.div>

          {/* graph des jours de la semaine */}
          <motion.div className="wk-graph" variants={item}>
            <div className="sec-label">Ta semaine, jour par jour 📅</div>
            <div className="wk-bars">
              {DAYS.map((dd, i) => (
                <div className={`wk-col ${i === todayIdx ? 'is-today' : ''}`} key={i}>
                  <span className={`wk-km ${week[i] > 0 ? '' : 'rest'}`}>{dayTag(i)}</span>
                  <div className="wk-track">
                    {week[i] > 0
                      ? <div className={`wk-bar ${i === peakIdx ? 'peak' : ''}`} style={{ height: `${Math.max(8, (week[i] / maxDay) * 100)}%` }} />
                      : <span className="wk-dot" />}
                  </div>
                  <div className={`wk-day ${week[i] > 0 ? 'on' : ''}`}>{dd}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* objectif : compte à rebours + distance de la semaine */}
          {hasObj && (
            <motion.div className={`wk-obj ${hasEvent && goalKm ? 'two' : 'one'}`} variants={item}>
              {hasEvent && (
                <div className="wk-tile wk-event">
                  <div className="sec-label">Objectif 🎯</div>
                  {event.name ? <div className="wk-event-name">{event.name}</div> : null}
                  <div className="accent-bar" style={{ margin: '18px 0 14px' }} />
                  {jxText ? <div className="wk-jx">{jxText}</div> : null}
                  {eventDateLbl ? <div className="wk-jx-sub">{eventDateLbl}</div> : null}
                </div>
              )}
              {goalKm && (
                <div className="wk-tile wk-goal">
                  <div className="sec-label">Objectif distance</div>
                  <div className="wk-goal-nums">{fmtKm(doneM)} <span className="wk-goal-tot">/ {goalKm} km</span></div>
                  <div className="goal-bar"><div className="goal-fill" style={{ width: `${goalPct}%` }} /></div>
                  <div className="wk-goal-lbl">
                    {goalReached ? 'Objectif atteint 🎉' : <>encore <b>{fmtKm(remainM)} km</b> cette semaine</>}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* pied : meilleur jour + attribution */}
          <motion.div className="c-foot" variants={item}>
            <div className="spot">
              <div className="pin"><MapPin size={26} /></div>
              <div>
                <div className="s-lbl">{summary?.records?.topDay ? 'Meilleur jour' : 'Cette semaine'}</div>
                <div className="s-name">
                  {summary?.records?.topDay
                    ? `${summary.records.topDay.day} · ${fmtKm(summary.records.topDay.distance)} km`
                    : `${fmtKm(doneM)} km`}
                </div>
              </div>
            </div>
            <div className="powered">Propulsé par <b>Strava</b></div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
})

export default WeeklyCard
