// Comparaisons "fun" du récap vidéo : références aléatoires pour la distance et l'élévation.
// On tire une référence AU HASARD parmi celles qui donnent un ratio parlant, pour varier
// à chaque récap sans jamais afficher un « ×0,0 » ni un nombre absurde.

export const DIST_REFS = [
  { name: 'un tour de piste', m: 400, emoji: '🏟️' },
  { name: 'un semi-marathon', m: 21097, emoji: '🏃' },
  { name: 'la traversée de la Manche', m: 33000, emoji: '🏊' },
  { name: 'le périph parisien', m: 35000, emoji: '🛣️' },
  { name: 'un marathon', m: 42195, emoji: '🏅' },
  { name: 'la Route des Grandes Alpes', m: 720000, emoji: '🏔️' },
  { name: 'Paris–Lyon', m: 465000, emoji: '🚄' },
  { name: 'Paris–Marseille', m: 775000, emoji: '🚄' },
  { name: 'la longueur de la France', m: 1000000, emoji: '🇫🇷' },
  { name: 'un tour de la Terre', m: 40075000, emoji: '🌍' },
]

export const ELEV_REFS = [
  { name: 'la Tour de Pise', m: 56, emoji: '🏛️' },
  { name: "l'Arc de Triomphe", m: 50, emoji: '🏛️' },
  { name: 'la Statue de la Liberté', m: 93, emoji: '🗽' },
  { name: 'la Tour Montparnasse', m: 210, emoji: '🏢' },
  { name: 'la Tour Eiffel', m: 330, emoji: '🗼' },
  { name: 'le Burj Khalifa', m: 828, emoji: '🏙️' },
  { name: 'le col du Tourmalet', m: 2115, emoji: '🚴' },
  { name: 'le Mont Blanc', m: 4808, emoji: '🗻' },
  { name: 'le Kilimandjaro', m: 5895, emoji: '🌋' },
  { name: "l'Everest", m: 8849, emoji: '🏔️' },
]

// Choisit une référence au hasard parmi celles dont le ratio total/ref est "parlant"
// (entre 0,2 et 40). À défaut, prend la référence la plus proche (échelle log).
// Renvoie { name, emoji, ratio } ou null si le total est nul.
export function pickComparison(refs, totalM, rng = Math.random) {
  if (!(totalM > 0)) return null
  const usable = refs.filter((r) => {
    const x = totalM / r.m
    return x >= 0.2 && x <= 40
  })
  let pool = usable
  if (!pool.length) {
    // plus proche en distance logarithmique (évite ×0,0 et les nombres délirants)
    const best = refs.slice().sort((a, b) => Math.abs(Math.log(totalM / a.m)) - Math.abs(Math.log(totalM / b.m)))[0]
    pool = [best]
  }
  const r = pool[Math.floor(rng() * pool.length)]
  return { name: r.name, emoji: r.emoji, ratio: totalM / r.m }
}
