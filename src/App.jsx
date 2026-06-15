import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, RefreshCw, Lock } from 'lucide-react'
import Landing from './components/Landing.jsx'
import Studio from './components/Studio.jsx'
import StravaSetup from './components/StravaSetup.jsx'
import { generateDemoActivities } from './lib/demoData.js'
import { authorizeUrl, readCallback, exchangeToken, fetchRange, stravaConfigured } from './lib/strava.js'
import { loadCache, saveCache, clearCache } from './lib/cache.js'
import { timeAgo } from './lib/format.js'

function Ambient() {
  const blobs = [
    { c: 'b1', x: [0, 50, -20, 0], y: [0, -30, 25, 0], dur: 19 },
    { c: 'b2', x: [0, -40, 30, 0], y: [0, 30, -20, 0], dur: 23 },
    { c: 'b3', x: [0, 30, -30, 0], y: [0, -20, 30, 0], dur: 27 },
  ]
  return (
    <>
      <div className="ambient">
        {blobs.map((b) => (
          <motion.div key={b.c} className={`blob ${b.c}`} animate={{ x: b.x, y: b.y }}
            transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }} />
        ))}
      </div>
      <div className="grain" />
    </>
  )
}

export default function App() {
  const [view, setView] = useState('landing') // landing | loading | studio
  const [data, setData] = useState(null) // { activities, athleteName, isDemo }
  const [error, setError] = useState(null)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [syncedAt, setSyncedAt] = useState(null)
  const tokenRef = useRef(null) // { accessToken, expiresAt } - en mémoire, jamais stocké

  // Démarrage : retour OAuth, sinon cache local
  useEffect(() => {
    const { code, error: oauthErr } = readCallback()
    if (oauthErr) { setError('Connexion Strava refusée.'); return }
    if (code) { connectWithCode(code); return }
    loadCache().then((cached) => {
      if (cached?.activities?.length) {
        setData({ activities: cached.activities, athleteName: cached.athleteName, isDemo: false })
        setSyncedAt(cached.fetchedAt)
        setView('studio')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Récupère 5 ans d'activités, met à jour l'état + le cache local.
  async function fetchAndStore(token, athleteName, expiresAt) {
    const now = new Date()
    const after = Math.floor(new Date(now.getFullYear() - 5, now.getMonth(), 1).getTime() / 1000)
    const before = Math.floor(now.getTime() / 1000)
    const all = await fetchRange(token, after, before, (n) => setLoadingMsg(`${n} activités récupérées…`))
    const fetchedAt = Date.now()
    tokenRef.current = { accessToken: token, expiresAt }
    setData({ activities: all, athleteName, isDemo: false })
    setSyncedAt(fetchedAt)
    saveCache({ activities: all, athleteName, fetchedAt })
  }

  async function connectWithCode(code) {
    setView('loading')
    setError(null)
    try {
      setLoadingMsg('Connexion à Strava…')
      const { access_token, athlete, expires_at } = await exchangeToken(code)
      setLoadingMsg('Récupération de tes activités…')
      await fetchAndStore(access_token, athlete?.firstname || athlete?.username || null, expires_at)
      setView('studio')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Une erreur est survenue.')
      setView('landing')
    }
  }

  async function resync() {
    const tk = tokenRef.current
    // token encore valide -> on re-télécharge sur place (avec écran de progression) ;
    // sinon (ex. après un rafraîchissement, token perdu) on repasse vite par Strava.
    if (!tk?.accessToken || !tk.expiresAt || tk.expiresAt * 1000 < Date.now() + 60000) {
      if (stravaConfigured) window.location.href = authorizeUrl()
      else setShowSetup(true)
      return
    }
    setView('loading')
    setLoadingMsg('Resynchronisation…')
    setError(null)
    try {
      await fetchAndStore(tk.accessToken, data?.athleteName ?? null, tk.expiresAt)
      setView('studio')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Resynchronisation échouée.')
      setView('studio')
    }
  }

  function handleConnect() {
    if (!stravaConfigured) { setShowSetup(true); return }
    window.location.href = authorizeUrl()
  }

  function handleDemo() {
    setError(null)
    setData({ activities: generateDemoActivities(), athleteName: null, isDemo: true })
    setView('studio')
  }

  function reset() {
    clearCache()
    tokenRef.current = null
    setData(null)
    setSyncedAt(null)
    setError(null)
    setView('landing')
  }

  const isReal = data && !data.isDemo

  return (
    <>
      <Ambient />
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
            </span>
            <span className="name">strava <b>wrapped</b></span>
          </div>
          {view === 'studio' ? (
            <div className="topbar-actions">
              {isReal && <span className="sync-status">Synchro {timeAgo(syncedAt)}</span>}
              {isReal && (
                <button className="btn btn-ghost btn-sm" onClick={resync}>
                  <RefreshCw size={14} /> Resync
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={14} /> {isReal ? 'Déconnexion' : 'Changer de source'}</button>
            </div>
          ) : (
            <span className="pill"><Lock size={13} /> 100% dans ton navigateur</span>
          )}
        </header>

        {error && <div className="error-banner">{error}</div>}

        {view === 'landing' && (
          <Landing onDemo={handleDemo} onConnect={handleConnect} stravaConfigured={stravaConfigured} />
        )}

        {view === 'loading' && (
          <div className="loading-screen">
            <div className="big-spin" />
            <p>{loadingMsg || 'Chargement…'}</p>
          </div>
        )}

        {view === 'studio' && data && (
          <Studio activities={data.activities} athleteName={data.athleteName} isDemo={data.isDemo} />
        )}
      </div>

      <StravaSetup open={showSetup} onClose={() => setShowSetup(false)} onDemo={handleDemo} />
    </>
  )
}
