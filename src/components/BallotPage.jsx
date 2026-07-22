import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Dices, ImageDown, Share2 } from 'lucide-react'
import BallotCard from './BallotCard.jsx'
import { BALLOT_MAJORS } from '../data/majors.js'
import { BALLOT_THEMES, DEFAULT_BALLOT_THEME } from '../data/ballotThemes.js'
import { useCardExport } from '../hooks/useCardExport.js'

const LS_KEY = 'ballot-recap-v1'
const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}

// Page « Majors Ballot Recap » : saisie des rejets/acceptations aux tirages au sort des
// Marathon Majors (aucune donnee Strava necessaire), choix d'un theme, export de la carte.
export default function BallotPage({ onBack }) {
  const saved = useMemo(loadSaved, [])
  const [entries, setEntries] = useState(saved.entries || {})
  const [themeId, setThemeId] = useState(saved.themeId || DEFAULT_BALLOT_THEME)
  const [seed, setSeed] = useState(saved.seed || 1)

  // la saisie survit au rechargement (localStorage), comme le cache d'activites
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ entries, themeId, seed })) } catch { /* stockage indisponible */ }
  }, [entries, themeId, seed])

  const theme = BALLOT_THEMES.find((t) => t.id === themeId) || BALLOT_THEMES[0]
  const exp = useCardExport({ formatId: 'story', periodLabel: 'majors ballot' })

  const bump = (id, key, delta) => setEntries((prev) => {
    const e = prev[id] || { rej: 0, acc: 0 }
    return { ...prev, [id]: { ...e, [key]: Math.max(0, Math.min(99, (e[key] || 0) + delta)) } }
  })

  // « Fini » = course courue (une fois suffit) : alimente le Six Star progress de la carte
  const toggleFin = (id) => setEntries((prev) => {
    const e = prev[id] || { rej: 0, acc: 0 }
    return { ...prev, [id]: { ...e, fin: !e.fin } }
  })

  const FinToggle = ({ id, city }) => (
    <button
      className={`fin-toggle${entries[id]?.fin ? ' on' : ''}`}
      onClick={() => toggleFin(id)}
      aria-label={`Course finie ${city}`}
      title="Course terminee (compte pour le Six Star progress)"
    >
      <i>{entries[id]?.fin ? '★' : '☆'}</i><span>Fini</span>
    </button>
  )

  return (
    <div className="studio ballot-page">
      <div className="controls-col">
        <div className="panel">
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 14 }}>
            <ArrowLeft size={14} /> Retour
          </button>
          <div className="ballot-intro">
            <h2>Majors Ballot Recap 🎟️</h2>
            <p>
              Compte tes <b>rejets</b> (et tes miracles) aux tirages au sort des Marathon Majors,
              puis partage la carte. Coche <b>⭐ Fini</b> quand tu as couru la course : ca remplit
              ton Six Star progress. Boston n'a pas de tirage (la souffrance passe par la qualif)
              mais compte pour les etoiles.
            </p>
          </div>
        </div>

        <div className="panel">
          <h3>🎲 Tes tirages</h3>
          <div className="ballot-races">
            {BALLOT_MAJORS.map((race) => {
              const e = entries[race.id] || { rej: 0, acc: 0 }
              return (
                <div className="ballot-race" key={race.id}>
                  <div className="br-name">{race.flag} <b>{race.city}</b></div>
                  <div className="br-counters">
                    <div className="counter">
                      <span className="c-lbl">❌ Rejets</span>
                      <div className="c-ctrl">
                        <button onClick={() => bump(race.id, 'rej', -1)} aria-label={`Moins de rejets ${race.city}`}>−</button>
                        <b>{e.rej || 0}</b>
                        <button onClick={() => bump(race.id, 'rej', 1)} aria-label={`Plus de rejets ${race.city}`}>+</button>
                      </div>
                    </div>
                    <div className="counter yes">
                      <span className="c-lbl">✅ Accepte</span>
                      <div className="c-ctrl">
                        <button onClick={() => bump(race.id, 'acc', -1)} aria-label={`Moins d'acceptations ${race.city}`}>−</button>
                        <b>{e.acc || 0}</b>
                        <button onClick={() => bump(race.id, 'acc', 1)} aria-label={`Plus d'acceptations ${race.city}`}>+</button>
                      </div>
                    </div>
                    <FinToggle id={race.id} city={race.city} />
                  </div>
                </div>
              )
            })}
            {/* Boston : pas de tirage au sort, mais indispensable au Six Star */}
            <div className="ballot-race boston">
              <div className="br-name">🇺🇸 <b>Boston</b> <span className="br-note">qualif, pas de tirage</span></div>
              <div className="br-counters">
                <FinToggle id="boston" city="Boston" />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>🎨 Theme</h3>
          <div className="ballot-themes">
            {BALLOT_THEMES.map((t) => (
              <button
                key={t.id}
                className={`ballot-theme${t.id === themeId ? ' active' : ''}`}
                style={{ background: t.css }}
                data-light={t.light ? 'true' : undefined}
                onClick={() => setThemeId(t.id)}
              >
                <span className="bt-emoji">{t.emoji}</span>
                <span className="bt-name">{t.name}</span>
              </button>
            ))}
          </div>
          <div className="divider" />
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setSeed((s) => s + 1)}>
            <Dices size={16} /> Re-melanger les punchlines
          </button>
          <div className="helper" style={{ marginTop: 10 }}>
            Les textes de la carte sont en anglais (c'est elle qui se partage) et tires au sort :
            re-melange jusqu'a trouver ta preferee.
          </div>
          <div className="export-row">
            <button className="btn btn-primary" onClick={exp.handleExport} disabled={exp.exporting}>
              <ImageDown size={16} /> {exp.exporting ? 'Export…' : 'Exporter'}
            </button>
            {canShare && (
              <button className="btn btn-ghost" onClick={exp.handleShare} disabled={exp.exporting}>
                <Share2 size={16} /> Partager
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="stage-wrap" ref={exp.wrapRef}>
        <div className="stage" style={{ transform: `scale(${exp.scale})` }}>
          <BallotCard ref={exp.cardRef} theme={theme} entries={entries} seed={seed} />
        </div>
      </div>

      {exp.toast && <div className="toast">{exp.toast.type === 'ok' ? '✅' : '⚠️'} {exp.toast.msg}</div>}
    </div>
  )
}
