// Les courses des Abbott World Marathon Majors accessibles par TIRAGE AU SORT, etat
// juillet 2026 : Tokyo, London, Berlin, Chicago, NYC, Sydney (7e major, 2025) et
// Cape Town (8e major, confirme juin 2026, 1re edition major le 23 mai 2027), plus
// Shanghai, candidat (2e evaluation le 6 dec. 2026), dont la loterie existe deja.
// Boston est exclu de la liste a tirage (qualif aux temps) mais compte pour le Six Star
// via un toggle « Fini » dedie dans la page.
// Visuels generiques par ville (landmark emoji + degrade), aucun logo officiel.
// `funFacts` : variantes de la ligne « Reality check », fondees sur des stats publiques.

export const BALLOT_MAJORS = [
  { id: 'tokyo', name: 'Tokyo Marathon', city: 'Tokyo', flag: '🇯🇵', landmark: '🗼',
    landmarkName: 'Tokyo Tower', from: '#FF9EC4', to: '#FF4D6D', oddsPct: 10,
    funFacts: [
      '~300,000 runners chase ~30,000 Tokyo bibs: a 1-in-10 shot 🎯',
      'Tokyo prints 9 rejection letters for every single yes 🖨️',
      'A 10% lottery: Tokyo says no to ~270,000 runners a year 🇯🇵',
    ] },
  { id: 'london', name: 'London Marathon', city: 'London', flag: '🇬🇧', landmark: '🎡',
    landmarkName: 'London Eye', from: '#FF5C5C', to: '#4D8BFF', oddsPct: 2,
    funFacts: [
      'More people applied for London 2027 (1.34M) than live in Dallas 🤯',
      'London 2027: 1,338,544 entries. A world record in heartbreak 💔',
      'A ~2% shot: London is the hardest « maybe » in running 🇬🇧',
    ] },
  { id: 'berlin', name: 'Berlin Marathon', city: 'Berlin', flag: '🇩🇪', landmark: '🐻',
    landmarkName: 'Berlin Bear', from: '#5CC8FF', to: '#2E6BFF', oddsPct: 30,
    funFacts: [
      'Berlin is the gentle major: about 1 in 3 ballot entrants gets in 🥨',
      'Berlin says yes ~30% of the time. A romantic, by major standards 🌹',
      '~100,000 enter the Berlin draw. Most still hear « nein » 🐻',
    ] },
  { id: 'chicago', name: 'Chicago Marathon', city: 'Chicago', flag: '🇺🇸', landmark: '🫘',
    landmarkName: 'Cloud Gate (The Bean)', from: '#FF6B6B', to: '#6BB8FF', oddsPct: 30,
    funFacts: [
      '200,000+ applied to Chicago, one of the friendliest draws at ~1 in 3 🌭',
      'Chicago odds: ~1 in 3. A coin flip with a cruel third side 🪙',
      'Even at ~30% odds, Chicago mails out ~140,000 rejections 📬',
    ] },
  { id: 'nyc', name: 'NYC Marathon', city: 'New York', flag: '🇺🇸', landmark: '🗽',
    landmarkName: 'Statue of Liberty', from: '#FFA94D', to: '#4D8BFF', oddsPct: 1,
    funFacts: [
      'NYC drawing acceptance (~1%) is stricter than Harvard (~3.6%) 🎓',
      '~240,000 entered the NYC drawing. About 2,400 got a bib 🚕',
      'A ~1% shot: 99% guaranteed to run a feelings marathon instead 🗽',
    ] },
  { id: 'sydney', name: 'Sydney Marathon', city: 'Sydney', flag: '🇦🇺', landmark: '🎭',
    landmarkName: 'Sydney Opera House', from: '#F5F9FF', to: '#38B6E8', oddsPct: 33,
    funFacts: [
      'Sydney ballot demand jumped 56% in year two: 79k to 123k entries 🦘',
      'Sydney says yes about 1 in 3 times. Generous, for a major 🌊',
      '123,000 runners entered the Sydney ballot. The harbour got crowded 🌉',
    ] },
  { id: 'capetown', name: 'Cape Town Marathon', city: 'Cape Town', flag: '🇿🇦', landmark: '🏔️',
    landmarkName: 'Table Mountain', from: '#34D399', to: '#FBBF24', oddsPct: null, tag: 'NEW',
    funFacts: [
      'Africa’s first major: its very first ballot opened in June 2026 🌍',
      'Cape Town is so new your rejection will be a collector’s item 🗿',
      'New in 2026: one more ballot to lose, this time with a view 🏔️',
    ] },
  { id: 'shanghai', name: 'Shanghai Marathon', city: 'Shanghai', flag: '🇨🇳', landmark: '🏙️',
    landmarkName: 'Oriental Pearl Tower', from: '#FF6161', to: '#FFC94D', oddsPct: 6, tag: 'CANDIDATE',
    funFacts: [
      '356,589 chased 23,000 Shanghai bibs, tougher odds than Tokyo 🥟',
      'Shanghai acceptance: ~6%. Not even a major yet. Already brutal 🏙️',
      'Candidate race, major-level pain: Shanghai says no ~94% of the time 🇨🇳',
    ] },
]
