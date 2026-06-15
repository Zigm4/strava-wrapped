// Cache LOCAL (IndexedDB) des activités, pour ne pas tout re-télécharger à chaque rafraîchissement.
// 100% dans le navigateur de l'utilisateur - rien n'est envoyé à un serveur.
// Le token Strava n'est PAS mis en cache (il reste en mémoire le temps de la session).

const DB = 'strava-wrapped'
const STORE = 'cache'
const KEY = 'activities'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveCache(data) {
  try {
    const db = await open()
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(data, KEY)
      tx.oncomplete = res
      tx.onerror = () => rej(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

export async function loadCache() {
  try {
    const db = await open()
    const data = await new Promise((res, rej) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      r.onsuccess = () => res(r.result || null)
      r.onerror = () => rej(r.error)
    })
    db.close()
    return data
  } catch {
    return null
  }
}

export async function clearCache() {
  try {
    const db = await open()
    await new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = res
      tx.onerror = res
    })
    db.close()
    return true
  } catch {
    return false
  }
}
