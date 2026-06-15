import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, ExternalLink } from 'lucide-react'
import { redirectUri } from '../lib/strava.js'

export default function StravaSetup({ open, onClose, onDemo }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
            <h2>Connecter ton compte Strava</h2>
            <p className="modal-sub">
              Strava exige un secret côté serveur pour l'authentification - impossible dans une page 100&nbsp;% statique.
              Une mini-fonction s'en charge (déjà intégrée en local). 3 étapes&nbsp;:
            </p>

            <ol className="steps">
              <li>
                <b>Crée une application API</b> sur <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">strava.com/settings/api <ExternalLink size={12} /></a>.
                <br />Mets <code>Authorization Callback Domain</code> = <code>{host}</code>.
              </li>
              <li>
                Copie <code>.env.example</code> en <code>.env</code> et renseigne&nbsp;:
                <pre>VITE_STRAVA_CLIENT_ID=ton_client_id{'\n'}STRAVA_CLIENT_SECRET=ton_secret</pre>
              </li>
              <li>Relance <code>npm run dev</code> - le bouton « Se connecter » sera actif.</li>
            </ol>

            <div className="redirect-note">
              URL de redirection utilisée : <code>{redirectUri()}</code>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => { onClose(); onDemo() }}><Play size={16} /> Voir la démo en attendant</button>
            </div>
            <p className="helper" style={{ marginTop: 14 }}>Pour le déploiement (GitHub Pages + Netlify/Cloudflare), tout est détaillé dans le README.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
