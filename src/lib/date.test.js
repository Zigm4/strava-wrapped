import { describe, it, expect } from 'vitest'
import {
  localYear, localMonth, localHour, localDayKey,
  localWeekday, localDayNumber, localTime, toStravaLocal,
} from './date.js'

describe('date — lecture hors fuseau de start_date_local', () => {
  // 31 juillet 23h30 LOCALE, sérialisée "Z" par Strava.
  const nearMidnight = '2026-07-31T23:30:00Z'

  it('garde le bon mois même à 23h30 (ne bascule pas en août)', () => {
    expect(localMonth(nearMidnight)).toBe(6) // juillet (0-based)
    expect(localYear(nearMidnight)).toBe(2026)
  })

  it('garde la bonne année au réveillon (31 déc 23h30 reste en N)', () => {
    const nye = '2025-12-31T23:30:00Z'
    expect(localYear(nye)).toBe(2025)
    expect(localMonth(nye)).toBe(11) // décembre
  })

  it('lit l\'heure murale locale', () => {
    expect(localHour(nearMidnight)).toBe(23)
    expect(localHour('2026-01-02T06:05:00Z')).toBe(6)
  })

  it('dayKey = les 10 premiers caractères, sans conversion', () => {
    expect(localDayKey(nearMidnight)).toBe('2026-07-31')
  })

  it('weekday est correct et indépendant du fuseau', () => {
    // 31 juillet 2026 est un vendredi (5)
    expect(localWeekday(nearMidnight)).toBe(5)
  })

  it('localDayNumber : deux jours consécutifs diffèrent de 1', () => {
    const a = localDayNumber('2026-07-31T23:59:00Z')
    const b = localDayNumber('2026-08-01T00:01:00Z')
    expect(b - a).toBe(1)
  })

  it('localTime ordonne correctement deux instants', () => {
    expect(localTime('2026-07-31T23:30:00Z')).toBeLessThan(localTime('2026-08-01T00:30:00Z'))
  })
})

describe('toStravaLocal — la démo suit la convention Strava', () => {
  it('encode l\'heure murale locale (pas l\'UTC)', () => {
    const d = new Date(2026, 6, 31, 23, 30, 0) // 31 juil 23h30 locale
    expect(toStravaLocal(d)).toBe('2026-07-31T23:30:00Z')
    // et se relit sans dérive :
    expect(localMonth(toStravaLocal(d))).toBe(6)
    expect(localHour(toStravaLocal(d))).toBe(23)
  })
})
