import { motion } from 'framer-motion'
import { Play, Lock, Zap, ImageDown } from 'lucide-react'
import { BACKGROUNDS } from '../data/backgrounds.js'

const MINIS = [
  { bg: 'sunset', big: '247', unit: 'km', lbl: 'ce mois-ci' },
  { bg: 'ocean', big: '5 840', unit: 'm', lbl: 'dénivelé +' },
  { bg: 'grape', big: '23', unit: '', lbl: 'sorties' },
]

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] },
})

export default function Landing({ onDemo, onConnect, onBallot, stravaConfigured }) {
  return (
    <div className="landing">
      <motion.div className="kicker" {...fade(0)}>
        <span className="dot" /> Ton mois sur Strava, version story
      </motion.div>

      <motion.h1 {...fade(0.08)}>
        Transforme tes <span className="grad">kilomètres</span> en une story qui claque.
      </motion.h1>

      <motion.p className="sub" {...fade(0.16)}>
        Connecte ton compte Strava, choisis un mois et un type d'effort, et repars avec une carte
        prête à poster : distance, dénivelé, records et ton spot préféré. Le tout dans ton navigateur.
      </motion.p>

      <motion.div className="cta" {...fade(0.24)}>
        <button className="btn btn-strava" onClick={onConnect}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
          Se connecter à Strava
        </button>
        <button className="btn btn-ghost" onClick={onDemo}>
          <Play size={17} /> Voir une démo
        </button>
      </motion.div>

      <motion.button className="ballot-teaser" onClick={onBallot} {...fade(0.3)}>
        <span className="bt-badge">Nouveau</span>
        🎟️ <b>Majors Ballot Recap</b> — encore recalé au tirage ? Fête ça.
        <span className="bt-arrow">→</span>
      </motion.button>

      {!stravaConfigured && (
        <motion.div className="helper" style={{ maxWidth: 460 }} {...fade(0.3)}>
          Strava n'est pas encore configuré sur ce déploiement - la démo fonctionne à 100 %.
          Voir le <code>README</code> pour activer la connexion (clé API + mini-fonction).
        </motion.div>
      )}

      <motion.div className="preview-strip" {...fade(0.36)}>
        {MINIS.map((m, i) => {
          const bg = BACKGROUNDS.find((b) => b.id === m.bg)
          return (
            <motion.div
              key={m.bg}
              className="mini"
              style={{ background: bg.css }}
              initial={{ opacity: 0, y: 30, rotate: i === 0 ? -5 : i === 2 ? 5 : 0 }}
              animate={{ opacity: 1, y: 0, rotate: i === 0 ? -5 : i === 2 ? 5 : 0 }}
              transition={{ delay: 0.45 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, rotate: 0, scale: 1.04 }}
            >
              <div className="big">{m.big}<span style={{ fontSize: 16, opacity: 0.8 }}> {m.unit}</span></div>
              <div className="lbl">{m.lbl}</div>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div className="reassure" {...fade(0.5)}>
        <span><Lock size={14} /> Rien n'est stocké</span>
        <span><Zap size={14} /> 100 % dans ton navigateur</span>
        <span><ImageDown size={14} /> Export PNG haute déf</span>
      </motion.div>
    </div>
  )
}
