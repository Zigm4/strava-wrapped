import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { FORMATS } from '../data/formats.js'
import { BALLOT_MAJORS } from '../data/majors.js'
import { BALLOT_COPY } from '../data/ballotCopy.js'
import {
  bucketFor, computeStats, luckLabel, makeDistinctPicker, mulberry32, pick, pickTitle,
  sixStarProgress, sixStarTier,
} from '../lib/ballot.js'

const CONFETTI = ['🎉', '🎊', '✨', '🏅', '🥇', '🍾', '⭐']

// Carte « Majors Ballot Recap » (format story 1080x1920). Tout le texte est en anglais
// (c'est la carte qui se partage) ; l'UI autour reste en francais. Aucune animation :
// rendu statique -> export PNG fiable via useCardExport.
const BallotCard = forwardRef(function BallotCard({ theme, entries = {}, seed = 1 }, ref) {
  const fmt = FORMATS.story
  const copy = BALLOT_COPY
  const stats = computeStats(entries)
  const won = stats.totalAcc > 0
  const title = pickTitle(copy.titles, stats, seed)
  const footer = pick(copy.footers, seed, 'footer')
  // Six Star : etoiles = 6 classiques finies (Boston via son toggle), bonus = Sydney/Cape Town
  const progress = sixStarProgress(entries)
  const showStars = stats.totalAttempts > 0 || progress.stars + progress.bonus > 0
  const starLine = showStars ? pick(copy.sixStar[sixStarTier(progress.stars)], seed, 'sixstar') : ''
  // « Reality check » : une vraie stat de tirage, piochee parmi les courses qui ont rejete
  const rejectedRaces = BALLOT_MAJORS.filter((r) => (entries[r.id]?.rej || 0) > 0 && r.funFacts?.length)
  const factRace = rejectedRaces.length ? pick(rejectedRaces, seed, 'fact') : null
  const fact = factRace ? pick(factRace.funFacts, seed, `${factRace.id}-fact`) : ''
  // une punchline par course, sans doublon dans un meme paquet
  const pickLine = makeDistinctPicker()

  // fit-to-frame (comme StoryCard) : reduit le corps si le contenu deborde du canevas
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
    // re-mesure une fois les webfonts actives : la 1re mesure (police de repli) sous-estime
    // parfois la hauteur -> le fit serait faux jusqu'au prochain changement d'entree
    let alive = true
    document.fonts?.ready?.then(() => { if (alive) measure() })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => { alive = false; ro.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, theme.id, seed])

  // confettis statiques, positions deterministes (seed) -> rendu stable + export fiable
  const confetti = []
  if (won) {
    const rnd = mulberry32(seed + 42)
    for (let i = 0; i < 16; i++) {
      confetti.push({
        e: CONFETTI[Math.floor(rnd() * CONFETTI.length)],
        left: `${4 + rnd() * 90}%`,
        top: `${2 + rnd() * 92}%`,
        rot: Math.round(rnd() * 80 - 40),
        size: 36 + Math.round(rnd() * 34),
        op: 0.3 + rnd() * 0.45,
      })
    }
  }

  return (
    <div
      ref={ref}
      className={`card ballot${won ? ' bl-won' : ''}`}
      data-btheme={theme.id}
      data-theme={theme.light ? 'light' : 'dark'}
      style={{ width: fmt.w, height: fmt.h, '--bacc': theme.accent }}
    >
      <div className="bg-layer"><div style={{ width: '100%', height: '100%', background: theme.css }} /></div>
      <div className="grain-c" />
      {won && (
        <div className="bl-confetti">
          {confetti.map((c, i) => (
            <span key={i} style={{ left: c.left, top: c.top, fontSize: c.size, opacity: c.op, transform: `rotate(${c.rot}deg)` }}>{c.e}</span>
          ))}
        </div>
      )}

      <div className="content bl-content">
        {theme.id === 'news' ? (
          <header className="bl-head">
            <div className="bl-mast">{copy.themes.news.masthead}</div>
            <div className="bl-dateline">
              <span>WORLD MARATHON MAJORS EDITION</span>
              <span>PRICE: ONE ENTRY FEE 💸</span>
            </div>
          </header>
        ) : theme.id === 'receipt' ? (
          <header className="bl-head">
            <div className="bl-rc-store">{copy.themes.receipt.header}</div>
            <div className="bl-rc-sub">{copy.themes.receipt.sub}</div>
            <div className="bl-rc-rule">************************************</div>
          </header>
        ) : theme.id === 'inbox' ? (
          <header className="bl-head">
            <div className="bl-kicker">🎟️ MAJORS BALLOT RECAP</div>
            <div className="bl-theme-h">
              {copy.themes.inbox.header}
              {stats.totalRej > 0 ? <span className="bl-unread">{stats.totalRej}</span> : null}
            </div>
            <div className="bl-inbox-sub">{copy.themes.inbox.sub}</div>
          </header>
        ) : (
          <header className="bl-head">
            <div className="bl-kicker">🎟️ MAJORS BALLOT RECAP</div>
            <div className="bl-theme-h">{copy.themes[theme.id]?.header}</div>
          </header>
        )}

        <div className="bl-body" ref={bodyRef} style={fit < 1 ? { transform: `scale(${fit})`, transformOrigin: 'top center' } : undefined}>
          <div className="bl-title">
            <h1>{title.title}</h1>
            {title.subtitle ? <p>{title.subtitle}</p> : null}
          </div>

          {theme.id === 'news' && stats.totalAttempts > 0 && (
            <div className="bl-headline">{won ? copy.themes.news.headlineAccepted : copy.themes.news.headlineRejected}</div>
          )}

          <div className="bl-races">
            {BALLOT_MAJORS.map((race) => {
              const e = entries[race.id] || { rej: 0, acc: 0 }
              const bucket = bucketFor(e)
              const line = pickLine(copy.perRace[bucket], seed, race.id, bucket)
              const isWin = (e.acc || 0) > 0
              const idle = bucket === 'neverTried'
              return (
                <div className={`bl-row${isWin ? ' win' : ''}${idle ? ' idle' : ''}`} key={race.id}>
                  <div className="bl-ico" style={{ background: `linear-gradient(135deg, ${race.from}, ${race.to})` }}>{race.landmark}</div>
                  <div className="bl-meta">
                    <div className="bl-name">
                      {race.name} <span className="bl-flag">{race.flag}</span>
                      {race.tag ? <span className="bl-tag">{race.tag}</span> : null}
                      {entries[race.id]?.fin ? <span className="bl-finstar">⭐</span> : null}
                    </div>
                    <div className="bl-line">{line}</div>
                  </div>
                  <div className="bl-score">
                    {idle ? (
                      <span className="bl-stamp never">{copy.stamps.never}</span>
                    ) : (
                      <>
                        {e.rej > 0 && <span className="bl-stamp no">{copy.stamps.denied}{e.rej > 1 ? ` ×${e.rej}` : ''}</span>}
                        {e.acc > 0 && <span className="bl-stamp yes">{copy.stamps.approved}{e.acc > 1 ? ` ×${e.acc}` : ''}</span>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bl-totals">
            <div className="bl-tot"><b>{stats.totalAttempts}</b><span>Ballots entered</span></div>
            <div className="bl-tot no"><b>{stats.totalRej}</b><span>Rejections</span></div>
            <div className="bl-tot rate"><b>{luckLabel(stats)}</b><span>Luck rate</span></div>
          </div>

          {showStars && (
            <div className="bl-sixstar">
              <div className="bl-stars">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className={i < progress.stars ? 'on' : ''}>{i < progress.stars ? '★' : '☆'}</span>
                ))}
                <b className="bl-star-count">{progress.stars}/6</b>
                {progress.bonus > 0 && <span className="bl-star-bonus">+{progress.bonus} bonus ⭐</span>}
              </div>
              <div className="bl-star-line">{starLine}</div>
            </div>
          )}

          {fact && (
            <div className="bl-fact"><b>REALITY CHECK 📊</b> {fact}</div>
          )}

          {theme.id === 'lottery' && stats.totalAttempts > 0 && (
            <div className={`bl-result${won ? ' win' : ''}`}>{won ? copy.themes.lottery.win : copy.themes.lottery.lose}</div>
          )}
          {theme.id === 'receipt' && stats.totalAttempts > 0 && (
            <div className="bl-result rc">{copy.themes.receipt.noRefunds}</div>
          )}
          {theme.id === 'inbox' && !won && stats.totalRej > 0 && (
            <div className="bl-quote">{copy.themes.inbox.storage}</div>
          )}
          {theme.id === 'heartbreak' && !won && stats.totalAttempts > 0 && (
            <div className="bl-quote">« {copy.themes.heartbreak.line} »</div>
          )}
        </div>

        <footer className="bl-foot">
          <span className="bl-tagline">{footer}</span>
          <span className="bl-brand">re<b>wind</b></span>
        </footer>
      </div>
    </div>
  )
})

export default BallotCard
