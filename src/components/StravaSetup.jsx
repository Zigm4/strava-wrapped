import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, ExternalLink } from 'lucide-react'
import { redirectUri } from '../lib/strava.js'

export default function StravaSetup({ open, onClose, onDemo }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const isLocal = import.meta.env.DEV || host === 'localhost' || host === '127.0.0.1'
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

            {isLocal ? (
              <>
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

                <p className="helper" style={{ marginTop: 14 }}>Pour le déploiement (Netlify), tout est détaillé dans le README.</p>
              </>
            ) : (
              <>
                <h2>Bientôt connecté à Strava</h2>
                <p className="modal-sub">
                  Ce déploiement n'est pas encore relié à un compte Strava&nbsp;: la connexion nécessite une clé API
                  côté administrateur. En attendant, la <b>démo</b> te montre exactement ce que ça donne, avec des données réalistes.
                </p>
                <p className="helper">
                  Tu es le propriétaire du site&nbsp;? Ajoute <code>VITE_STRAVA_CLIENT_ID</code> et <code>STRAVA_CLIENT_SECRET</code>
                  dans les variables d'environnement Netlify, puis redéploie. Détails dans le README.
                </p>
              </>
            )}

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => { onClose(); onDemo() }}><Play size={16} /> Voir la démo{isLocal ? ' en attendant' : ''}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
