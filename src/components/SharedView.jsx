import { useRef, useState, useLayoutEffect } from 'react'
import StoryCard from './StoryCard.jsx'
import { hydrateSnapshot } from '../lib/share.js'
import { FORMATS } from '../data/formats.js'
import { BACKGROUNDS, ACCENTS } from '../data/backgrounds.js'

// Vue "viewer" : affiche une carte reçue via un lien #w=..., rendue 100% en local,
// avec un CTA pour créer la sienne. Aucune donnée n'est envoyée nulle part.
export default function SharedView({ snapshot, onCreate }) {
  const props = hydrateSnapshot(snapshot, BACKGROUNDS, ACCENTS)
  const fmt = FORMATS[props?.formatId] || FORMATS.story
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(0.4)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const recompute = () => {
      const pad = 24
      const s = Math.min((el.clientWidth - pad) / fmt.w, (el.clientHeight - pad) / fmt.h)
      setScale(Math.max(0.1, Math.min(s, 0.62)))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    window.addEventListener('resize', recompute)
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute) }
  }, [fmt.w, fmt.h])

  if (!props) {
    return (
      <div className="shared shared-empty">
        <p>Ce lien Rewind est illisible ou corrompu.</p>
        <button className="btn btn-strava" onClick={onCreate}>Créer le mien</button>
      </div>
    )
  }

  return (
    <div className="shared">
      <div className="shared-stage" ref={wrapRef}>
        <div className="stage" style={{ transform: `scale(${scale})` }}>
          <StoryCard {...props} />
        </div>
      </div>
      <div className="shared-cta">
        <div className="shared-tagline">Créée avec <b>Rewind</b> · 100% dans le navigateur</div>
        <button className="btn btn-strava" onClick={onCreate}>Crée le tien →</button>
      </div>
    </div>
  )
}
