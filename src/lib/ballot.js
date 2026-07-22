// Logique pure du « Majors Ballot Recap » : totaux, choix des punchlines (déterministe
// via un seed -> le bouton 🎲 re-mélange, sinon la carte est stable d'un rendu à l'autre).

// Hash 32 bits (FNV-1a) d'une chaîne — sert à saler le seed par course/usage.
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// PRNG déterministe (mulberry32) : même seed -> même suite.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Index déterministe dans [0, len) pour (seed, salt) ; -1 si liste vide.
export function pickIndex(len, seed, salt = '') {
  if (!len) return -1
  const r = mulberry32((Math.imul(seed, 2654435761) ^ hashStr(salt)) >>> 0)()
  return Math.floor(r * len)
}

// Tire un élément d'une liste, déterministe pour (seed, salt).
export function pick(arr, seed, salt = '') {
  if (!arr || !arr.length) return ''
  return arr[pickIndex(arr.length, seed, salt)]
}

// Tireur SANS doublon : mêmes tirages déterministes, mais si la ligne est déjà prise
// dans ce paquet, on avance à la suivante (cycle). Évite 3 courses avec la même punchline
// sur une carte ; une fois le paquet épuisé, les répétitions reprennent.
export function makeDistinctPicker() {
  const taken = new Map() // bucketKey -> Set d'index consommés
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

// Classe une course selon son bilan { rej, acc } -> clé d'un paquet de punchlines.
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

// Totaux globaux sur toutes les courses. `entries` = { [raceId]: { rej, acc } }.
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

// « Luck rate » affiché : pourcentage d'acceptation, ou un néant bien senti.
export function luckLabel(stats) {
  if (stats.totalAttempts === 0) return '—'
  if (stats.totalAcc === 0) return '0.0%'
  const pct = (stats.totalAcc / stats.totalAttempts) * 100
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`
}

// Choisit le titre de la carte : profil (accepté quelque part / que des rejets / rien tenté),
// puis le palier `minRejections` le plus élevé atteint ; à égalité, tirage au seed.
export function pickTitle(titles, stats, seed) {
  const eligible = (titles || []).filter(
    (t) => t.profile === stats.profile && (t.minRejections || 0) <= stats.totalRej,
  )
  if (!eligible.length) return { title: 'Majors Ballot Recap', subtitle: '' }
  const top = Math.max(...eligible.map((t) => t.minRejections || 0))
  const tier = eligible.filter((t) => (t.minRejections || 0) === top)
  return pick(tier, seed, 'title')
}
