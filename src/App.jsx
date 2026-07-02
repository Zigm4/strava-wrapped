import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, RefreshCw, Lock } from 'lucide-react'
import Landing from './components/Landing.jsx'
import Studio from './components/Studio.jsx'
import StravaSetup from './components/StravaSetup.jsx'
import { generateDemoActivities } from './lib/demoData.js'
import { authorizeUrl, readCallback, exchangeToken, refreshAccessToken, fetchRange, stravaConfigured } from './lib/strava.js'
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
  const [syncing, setSyncing] = useState(false) // resync en place (sans quitter le studio)
  const [coverageStart, setCoverageStart] = useState(null) // { year, month } : début de l'historique couvert
  const tokenRef = useRef(null) // { accessToken, refreshToken, expiresAt } - en mémoire, jamais stocké

  // Démarrage : retour OAuth, sinon cache local
  useEffect(() => {
    const { code, error: oauthErr, stateOk } = readCallback()
    const bootFromCache = () =>
      loadCache().then((cached) => {
        if (cached?.activities?.length) {
          setData({ activities: cached.activities, athleteName: cached.athleteName, isDemo: false })
          setSyncedAt(cached.fetchedAt)
          if (cached.coverageStart) setCoverageStart(cached.coverageStart)
          setView('studio')
        }
      })
    if (oauthErr) { setError('Connexion Strava refusée.'); bootFromCache(); return }
    if (code && !stateOk) { setError('Vérification de sécurité échouée, relance la connexion.'); bootFromCache(); return }
    if (code) { connectWithCode(code); return }
    bootFromCache()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Récupère 5 ans d'activités, met à jour l'état + le cache local.
  async function fetchAndStore(token, athleteName, expiresAt) {
    const now = new Date()
    const after = Math.floor(new Date(now.getFullYear() - 5, now.getMonth(), 1).getTime() / 1000)
    const before = Math.floor(now.getTime() / 1000)
    const all = await fetchRange(token, after, before, (n) => setLoadingMsg(`${n} activités récupérées…`))
    const fetchedAt = Date.now()
    const cov = { year: now.getFullYear() - 5, month: now.getMonth() }
    tokenRef.current = { ...(tokenRef.current || {}), accessToken: token, expiresAt }
    setData({ activities: all, athleteName, isDemo: false })
    setSyncedAt(fetchedAt)
    setCoverageStart(cov)
    saveCache({ activities: all, athleteName, fetchedAt, coverageStart: cov })
  }

  async function connectWithCode(code) {
    setView('loading')
    setError(null)
    try {
      setLoadingMsg('Connexion à Strava…')
      const { access_token, refresh_token, athlete, expires_at } = await exchangeToken(code)
      tokenRef.current = { accessToken: access_token, refreshToken: refresh_token, expiresAt: expires_at }
      setLoadingMsg('Récupération de tes activités…')
      await fetchAndStore(access_token, athlete?.firstname || athlete?.username || null, expires_at)
      setView('studio')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Une erreur est survenue.')
      setView('landing')
    }
  }

  // Renvoie un access token valide (rafraîchi si besoin via le refresh_token en mémoire),
  // ou null si aucun token exploitable (typiquement après un rechargement de page).
  async function ensureFreshToken() {
    const tk = tokenRef.current
    if (!tk?.accessToken) return null
    const stillValid = tk.expiresAt && tk.expiresAt * 1000 > Date.now() + 60000
    if (stillValid) return tk.accessToken
    if (tk.refreshToken) {
      const r = await refreshAccessToken(tk.refreshToken)
      tokenRef.current = { accessToken: r.access_token, refreshToken: r.refresh_token || tk.refreshToken, expiresAt: r.expires_at }
      return r.access_token
    }
    return null
  }

  // Resynchronisation INCRÉMENTALE et EN PLACE : on ne re-télécharge que les activités
  // depuis la dernière synchro (fusion par id), et on reste dans le studio -> la
  // personnalisation de la carte n'est pas perdue.
  async function resync() {
    let token = null
    try { token = await ensureFreshToken() } catch (err) { console.error(err) }
    if (!token) {
      // plus de token en mémoire (ex. après un F5) -> reconnexion Strava (silencieuse si déjà autorisé)
      if (stravaConfigured) window.location.href = authorizeUrl()
      else setShowSetup(true)
      return
    }
    setSyncing(true)
    setError(null)
    try {
      const now = new Date()
      const existing = data?.activities || []
      const since = syncedAt
        ? Math.floor(syncedAt / 1000) - 3600 // petit chevauchement d'1 h
        : Math.floor(new Date(now.getFullYear() - 5, now.getMonth(), 1).getTime() / 1000)
      const before = Math.floor(now.getTime() / 1000)
      const fresh = await fetchRange(token, since, before)
      const byId = new Map(existing.map((a) => [a.id, a]))
      for (const a of fresh) byId.set(a.id, a) // les récentes remplacent/complètent
      const merged = [...byId.values()]
      const fetchedAt = Date.now()
      const cov = coverageStart || { year: now.getFullYear() - 5, month: now.getMonth() }
      setData({ activities: merged, athleteName: data?.athleteName ?? null, isDemo: false })
      setSyncedAt(fetchedAt)
      saveCache({ activities: merged, athleteName: data?.athleteName ?? null, fetchedAt, coverageStart: cov })
    } catch (err) {
      console.error(err)
      setError(err.message || 'Resynchronisation échouée.')
    } finally {
      setSyncing(false)
    }
  }

  function handleConnect() {
    if (!stravaConfigured) { setShowSetup(true); return }
    window.location.href = authorizeUrl()
  }

  function handleDemo() {
    setError(null)
    const now = new Date()
    setData({ activities: generateDemoActivities(), athleteName: null, isDemo: true })
    setCoverageStart({ year: now.getFullYear() - 5, month: now.getMonth() })
    setView('studio')
  }

  function reset() {
    clearCache()
    tokenRef.current = null
    setData(null)
    setSyncedAt(null)
    setCoverageStart(null)
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
              {isReal && <span className="sync-status">{syncing ? 'Synchro en cours…' : `Synchro ${timeAgo(syncedAt)}`}</span>}
              {isReal && (
                <button className="btn btn-ghost btn-sm" onClick={resync} disabled={syncing}>
                  <RefreshCw size={14} className={syncing ? 'spin' : ''} /> {syncing ? 'Synchro…' : 'Resync'}
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
          <Studio activities={data.activities} athleteName={data.athleteName} isDemo={data.isDemo} coverageStart={coverageStart} />
        )}
      </div>

      <StravaSetup open={showSetup} onClose={() => setShowSetup(false)} onDemo={handleDemo} />
    </>
  )
}
