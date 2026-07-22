// Banc de punchlines (anglais) du « Majors Ballot Recap » — sélection finale d'un panel
// de 3 rédacteurs (deadpan / dramatique / meme) arbitré par un juge. Les lignes sont
// tirées au sort (seed) par course/usage — voir src/lib/ballot.js. Longueurs contraintes
// par la carte : perRace ≤ 55 car., title ≤ 32, subtitle ≤ 64, footers ≤ 60.

export const BALLOT_COPY = {
  perRace: {
    acceptedFirstTry: [
      '✅ First ballot. Go buy a lottery ticket. Now.',
      '✅ Beginner’s luck is a real medical condition.',
      'First try. FIRST TRY. The audacity. 🍀',
      '✅ In on attempt one. Statistically offensive.',
      '✅ Accepted instantly. The lottery has a favorite 🙄',
    ],
    accepted: [
      '✅ Persistence: 1, Random number generator: 0.',
      '✅ Rejected, rejected, ACCEPTED. Character arc.',
      'Suffered, wept, then... VICTORY 🏅',
      '✅ Screenshot the email. Frame it. Tattoo it 🖼️',
      'A few scars, one glorious YES 🎉',
    ],
    acceptedAfterMany: [
      '✅ After years of no: YES. Cry. It’s allowed.',
      '✅ The ballot finally ran out of ways to say no.',
      'Rose from the rejection ashes 🔥🐦',
      '✅ They rejected us so long we became family.',
      'Years of pain. One email. REDEMPTION. 🕊️',
    ],
    rejectedOnce: [
      '❌ Rejected once. Adorable. Just wait.',
      '❌ One down. See you next December.',
      '❌ One no. The wound is fresh. 🥀',
      '❌ Denied. The violins have begun. 🎻',
      '❌ Left on read by an entire marathon 📵',
    ],
    rejectedFew: [
      '❌ They know our name now. Still say no.',
      '❌ Rejection is now an annual tradition.',
      '❌ Entering ballots is our real cardio.',
      '❌ The “no” folder is filling up nicely 🗂️',
      '❌ Losing streak: active. Hope: also active ✨',
    ],
    rejectedMany: [
      '❌ The ballot has us on a “do not draw” list.',
      '❌ Our entry fee funds someone else’s medal.',
      '❌ Rejected so often it’s basically a hobby.',
      '❌ At this point it’s a long-term relationship 💍',
      '❌ The rejection email autofills your name now 📧',
      '❌ Certified veteran of pain. Salute 🫡',
    ],
    neverTried: [
      '🫥 Can’t get rejected if you never enter.',
      '🤷 Zero attempts. Zero heartbreak. Zero glory.',
      '🙈 Still gathering the courage. Understandable.',
      '😶 Not entered yet. The ballot misses you.',
    ],
  },
  titles: [
    { profile: 'someAccepted', minRejections: 0, title: 'Blessed By The Ballot ✨', subtitle: 'You won a lottery grown adults cry about. Enjoy it.' },
    { profile: 'someAccepted', minRejections: 0, title: 'The Chosen One 🎉', subtitle: 'Accepted with barely any suffering. The rest of us are fine.' },
    { profile: 'someAccepted', minRejections: 3, title: 'The Comeback Kid 🎬', subtitle: 'They said no. Then destiny cleared its throat.' },
    { profile: 'someAccepted', minRejections: 8, title: 'The Redemption Arc 🏅', subtitle: 'Years of no, then one yes. Hollywood wants the rights.' },
    { profile: 'allRejected', minRejections: 1, title: 'The Journey Begins ❌', subtitle: 'One rejection down. Collect them all — everyone else does.' },
    { profile: 'allRejected', minRejections: 4, title: 'A Symphony of No 🎻', subtitle: 'Four movements, all in the key of rejection.' },
    { profile: 'allRejected', minRejections: 8, title: 'CEO of Rejection 💼', subtitle: 'Double digits loading. The lottery fears your commitment.' },
    { profile: 'allRejected', minRejections: 15, title: 'Final Boss of Rejection 🗿', subtitle: '15+ noes. Museums have asked about the collection.' },
    { profile: 'nothingYet', minRejections: 0, title: 'Spectator Mode 🍿', subtitle: 'Watching from a safe distance. The drama awaits your debut.' },
  ],
  footers: [
    'Entry fees lovingly donated to the rejection gods 🙏',
    'Same time next year. Bring tissues. 🗓️',
    'Running 42km is easy. Getting in is the real marathon 🏁',
    'Powered by hope, denial, and calendar reminders 📅',
    'The odds are never in your favor. Enter anyway 🎲',
  ],
  themes: {
    lottery: {
      header: 'SCRATCH & WEEP 🎫',
      lose: 'Scratched. Nothing. Again. Classic. 💔',
      win: 'JACKPOT! Someone check the machine 🎰',
    },
    news: {
      masthead: 'The Daily Rejection',
      headlineRejected: 'LOCAL RUNNER DENIED AGAIN — VOWS TO “FEEL NOTHING” ❌',
      headlineAccepted: 'MIRACLE: BALLOT SAYS YES — SCIENTISTS BAFFLED ✅',
    },
    passport: {
      header: 'Marathon Passport 🛂',
      denied: 'DENIED',
      approved: 'APPROVED?!',
    },
    heartbreak: {
      header: 'It’s Not You. It’s Odds.',
      line: 'The ballot said “let’s just be friends” — again. 💔',
    },
  },
}
