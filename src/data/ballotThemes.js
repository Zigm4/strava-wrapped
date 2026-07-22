// Themes visuels de la carte « Majors Ballot Recap », chacun avec une identite forte,
// independante des fonds du rewind. `light: true` -> encre sombre sur fond clair.

export const BALLOT_THEMES = [
  { id: 'lottery', name: 'Lottery Ticket', emoji: '🎟️', light: false,
    css: 'radial-gradient(130% 90% at 50% -10%, #4a3407 0%, transparent 55%), linear-gradient(170deg, #2b1e05 0%, #171003 55%, #0d0902 100%)',
    accent: '#ffd166' },
  { id: 'news', name: 'Breaking News', emoji: '🗞️', light: true,
    css: 'radial-gradient(120% 100% at 50% 0%, #fbf7ec 0%, #f1ead9 70%, #e8dfc9 100%)',
    accent: '#c62828' },
  { id: 'passport', name: 'Passport', emoji: '🛂', light: false,
    css: 'radial-gradient(120% 90% at 50% -10%, #1b4433 0%, transparent 55%), linear-gradient(170deg, #123227 0%, #0a2018 60%, #061510 100%)',
    accent: '#d4af37' },
  { id: 'heartbreak', name: 'Heartbreak', emoji: '💔', light: false,
    css: 'radial-gradient(120% 90% at 30% -10%, #6d1030 0%, transparent 55%), linear-gradient(165deg, #3d0a1d 0%, #1d0510 55%, #0d020a 100%)',
    accent: '#ff4d78' },
  { id: 'receipt', name: 'Receipt of Pain', emoji: '🧾', light: true,
    css: 'radial-gradient(120% 100% at 50% 0%, #fdfaf1 0%, #f5efdc 70%, #ece4cb 100%)',
    accent: '#c2410c' },
  { id: 'inbox', name: 'Rejection Inbox', emoji: '📥', light: false,
    css: 'radial-gradient(120% 90% at 50% -10%, #26354d 0%, transparent 55%), linear-gradient(170deg, #1b2637 0%, #101826 60%, #0a0f18 100%)',
    accent: '#60a5fa' },
]

export const DEFAULT_BALLOT_THEME = 'lottery'
