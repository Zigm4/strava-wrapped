// Les courses des Abbott World Marathon Majors accessibles par TIRAGE AU SORT, état
// juillet 2026 : Tokyo, London, Berlin, Chicago, NYC, Sydney (7e major, 2025) et
// Cape Town (8e major, confirmé juin 2026, 1re édition major le 23 mai 2027) — plus
// Shanghai, candidat (2e évaluation le 6 déc. 2026), dont la loterie existe déjà.
// Boston est exclu : qualification aux temps, pas de ballot.
// Visuels génériques par ville (landmark emoji + dégradé) — aucun logo officiel,
// les marques des courses sont déposées. `funFact` : stats publiques réelles (sourcées),
// affichées dans la ligne « Reality check » de la carte.

export const BALLOT_MAJORS = [
  { id: 'tokyo', name: 'Tokyo Marathon', city: 'Tokyo', flag: '🇯🇵', landmark: '🗼',
    landmarkName: 'Tokyo Tower', from: '#FF9EC4', to: '#FF4D6D', oddsPct: 10,
    funFact: '~300,000 runners chase ~30,000 Tokyo bibs — a 1-in-10 shot 🎯' },
  { id: 'london', name: 'London Marathon', city: 'London', flag: '🇬🇧', landmark: '🎡',
    landmarkName: 'London Eye', from: '#FF5C5C', to: '#4D8BFF', oddsPct: 2,
    funFact: 'More people applied for London 2027 (1.34M) than live in Dallas 🤯' },
  { id: 'berlin', name: 'Berlin Marathon', city: 'Berlin', flag: '🇩🇪', landmark: '🐻',
    landmarkName: 'Berlin Bear', from: '#5CC8FF', to: '#2E6BFF', oddsPct: 30,
    funFact: 'Berlin is the gentle major: about 1 in 3 ballot entrants gets in 🥨' },
  { id: 'chicago', name: 'Chicago Marathon', city: 'Chicago', flag: '🇺🇸', landmark: '🫘',
    landmarkName: 'Cloud Gate (The Bean)', from: '#FF6B6B', to: '#6BB8FF', oddsPct: 30,
    funFact: '200,000+ applied to Chicago — one of the friendliest draws at ~1 in 3 🌭' },
  { id: 'nyc', name: 'NYC Marathon', city: 'New York', flag: '🇺🇸', landmark: '🗽',
    landmarkName: 'Statue of Liberty', from: '#FFA94D', to: '#4D8BFF', oddsPct: 1,
    funFact: 'NYC’s ~1% drawing is stricter than Harvard admissions (~3.6%) 🎓' },
  { id: 'sydney', name: 'Sydney Marathon', city: 'Sydney', flag: '🇦🇺', landmark: '🎭',
    landmarkName: 'Sydney Opera House', from: '#F5F9FF', to: '#38B6E8', oddsPct: 33,
    funFact: 'Sydney ballot demand jumped 56% in year two: 79k → 123k entries 🦘' },
  { id: 'capetown', name: 'Cape Town Marathon', city: 'Cape Town', flag: '🇿🇦', landmark: '🏔️',
    landmarkName: 'Table Mountain', from: '#34D399', to: '#FBBF24', oddsPct: null, tag: 'NEW',
    funFact: 'Africa’s first major — its very first ballot opened in June 2026 🌍' },
  { id: 'shanghai', name: 'Shanghai Marathon', city: 'Shanghai', flag: '🇨🇳', landmark: '🏙️',
    landmarkName: 'Oriental Pearl Tower', from: '#FF6161', to: '#FFC94D', oddsPct: 6, tag: 'CANDIDATE',
    funFact: '356,589 chased 23,000 Shanghai bibs — tougher odds than Tokyo 🥟' },
]
