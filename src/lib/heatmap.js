// Construit la grille d'une heatmap calendrier à partir d'une map { 'YYYY-MM-DD': valeur }.
// Pur, hors fuseau (on fabrique les clés de jour nous-mêmes en UTC).

const pad = (n) => String(n).padStart(2, '0')
const dayKeyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}` // m: 0-based

// Grille d'un MOIS : semaines (lignes) × 7 jours (lundi→dimanche).
// Renvoie { type:'month', weeks:[[cell|null ×7]], max } où cell = { key, value, day }.
export function monthHeatmap(year, month, daily = {}) {
  const first = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  // décalage lundi=0 … dimanche=6
  const startOffset = (first.getUTCDay() + 6) % 7
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  let max = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKeyOf(year, month, d)
    const value = daily[key] || 0
    if (value > max) max = value
    cells.push({ key, value, day: d })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { type: 'month', weeks, max }
}

// Grille d'une ANNÉE, façon GitHub : colonnes = semaines, chaque colonne 7 jours (lundi→dimanche).
// Renvoie { type:'year', columns:[[cell|null ×7]], max }.
export function yearHeatmap(year, daily = {}) {
  const start = new Date(Date.UTC(year, 0, 1))
  const startOffset = (start.getUTCDay() + 6) % 7 // lundi=0
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInYear = isLeap ? 366 : 365
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  let max = 0
  for (let i = 0; i < daysInYear; i++) {
    const dt = new Date(Date.UTC(year, 0, 1 + i))
    const key = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
    const value = daily[key] || 0
    if (value > max) max = value
    cells.push({ key, value, month: dt.getUTCMonth() })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const columns = []
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7))
  return { type: 'year', columns, max }
}

// Intensité 0..4 d'une valeur (paliers, pour colorer les cellules).
export function intensity(value, max) {
  if (!value || max <= 0) return 0
  const r = value / max
  if (r > 0.66) return 4
  if (r > 0.4) return 3
  if (r > 0.15) return 2
  return 1
}
