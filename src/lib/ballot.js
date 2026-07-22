// Logique pure du « Majors Ballot Recap » : totaux, choix des punchlines (deterministe
// via un seed -> le bouton 🎲 re-melange, sinon la carte est stable d'un rendu a l'autre).

// Hash 32 bits (FNV-1a) d'une chaine, sert a saler le seed par course/usage.
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// PRNG deterministe (mulberry32) : meme seed -> meme suite.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Index deterministe dans [0, len) pour (seed, salt) ; -1 si liste vide.
export function pickIndex(len, seed, salt = '') {
  if (!len) return -1
  const r = mulberry32((Math.imul(seed, 2654435761) ^ hashStr(salt)) >>> 0)()
  return Math.floor(r * len)
}

// Tire un element d'une liste, deterministe pour (seed, salt).
export function pick(arr, seed, salt = '') {
  if (!arr || !arr.length) return ''
  return arr[pickIndex(arr.length, seed, salt)]
}

// Tireur SANS doublon : memes tirages deterministes, mais si la ligne est deja prise
// dans ce paquet, on avance a la suivante (cycle). Evite 3 courses avec la meme punchline
// sur une carte ; une fois le paquet epuise, les repetitions reprennent.
export function makeDistinctPicker() {
  const taken = new Map() // bucketKey -> Set d'index consommes
  return (arr, seed, salt, bucketKey) => {
    if (!arr || !arr.length) return ''
    let idx = pickIndex(arr.length, seed, salt)
    const used = taken.get(bucketKey) || taken.set(bucketKey, new Set()).get(bucketKey)
    if (used.size < arr.length) {
      while (used.has(idx)) idx = (idx + 1) % arr.length
    }
    used.add(idx)
    return arr[idx]
  }
}

// Classe une course selon son bilan { rej, acc } -> cle d'un paquet de punchlines.
export function bucketFor({ rej = 0, acc = 0 } = {}) {
  if (acc > 0) {
    if (rej === 0) return 'acceptedFirstTry'
    if (rej >= 4) return 'acceptedAfterMany'
    return 'accepted'
  }
  if (rej === 0) return 'neverTried'
  if (rej === 1) return 'rejectedOnce'
  if (rej <= 3) return 'rejectedFew'
  return 'rejectedMany'
}

// Totaux globaux sur toutes les courses. `entries` = { [raceId]: { rej, acc, fin } }.
export function computeStats(entries = {}) {
  let totalRej = 0
  let totalAcc = 0
  let triedCount = 0
  for (const e of Object.values(entries)) {
    const rej = Math.max(0, e?.rej || 0)
    const acc = Math.max(0, e?.acc || 0)
    totalRej += rej
    totalAcc += acc
    if (rej + acc > 0) triedCount++
  }
  const totalAttempts = totalRej + totalAcc
  return {
    totalAttempts,
    totalRej,
    totalAcc,
    triedCount,
    profile: totalAcc > 0 ? 'someAccepted' : totalAttempts > 0 ? 'allRejected' : 'nothingYet',
  }
}

// « Luck rate » affiche : pourcentage d'acceptation, ou un neant bien senti.
export function luckLabel(stats) {
  if (stats.totalAttempts === 0) return 'N/A'
  if (stats.totalAcc === 0) return '0.0%'
  const pct = (stats.totalAcc / stats.totalAttempts) * 100
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`
}

// Choisit le titre de la carte : profil (accepte quelque part / que des rejets / rien tente),
// puis le palier `minRejections` le plus eleve atteint ; a egalite, tirage au seed.
export function pickTitle(titles, stats, seed) {
  const eligible = (titles || []).filter(
    (t) => t.profile === stats.profile && (t.minRejections || 0) <= stats.totalRej,
  )
  if (!eligible.length) return { title: 'Majors Ballot Recap', subtitle: '' }
  const top = Math.max(...eligible.map((t) => t.minRejections || 0))
  const tier = eligible.filter((t) => (t.minRejections || 0) === top)
  return pick(tier, seed, 'title')
}

// Six Star : les 6 majors historiques (Boston inclus, via son toggle « Fini » dedie) ;
// Sydney et Cape Town comptent en etoiles bonus. Shanghai (candidat) n'en donne pas.
export const SIX_STAR_IDS = ['tokyo', 'boston', 'london', 'berlin', 'chicago', 'nyc']
export const BONUS_STAR_IDS = ['sydney', 'capetown']

export function sixStarProgress(entries = {}) {
  const stars = SIX_STAR_IDS.filter((id) => entries[id]?.fin).length
  const bonus = BONUS_STAR_IDS.filter((id) => entries[id]?.fin).length
  return { stars, bonus }
}

// Palier du texte « Six Star progress » selon le nombre d'etoiles (sur 6).
export function sixStarTier(stars) {
  if (stars >= 6) return 'full'
  if (stars >= 3) return 'halfway'
  if (stars >= 1) return 'started'
  return 'zero'
}
