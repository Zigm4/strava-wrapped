import { describe, it, expect } from 'vitest'
import { bucketFor, computeStats, luckLabel, makeDistinctPicker, pick, pickTitle } from './ballot.js'

describe('bucketFor', () => {
  it('classe les acceptations', () => {
    expect(bucketFor({ rej: 0, acc: 1 })).toBe('acceptedFirstTry')
    expect(bucketFor({ rej: 2, acc: 1 })).toBe('accepted')
    expect(bucketFor({ rej: 4, acc: 1 })).toBe('acceptedAfterMany')
  })
  it('classe les rejets', () => {
    expect(bucketFor({ rej: 0, acc: 0 })).toBe('neverTried')
    expect(bucketFor({})).toBe('neverTried')
    expect(bucketFor(undefined)).toBe('neverTried')
    expect(bucketFor({ rej: 1 })).toBe('rejectedOnce')
    expect(bucketFor({ rej: 3 })).toBe('rejectedFew')
    expect(bucketFor({ rej: 4 })).toBe('rejectedMany')
  })
})

describe('computeStats', () => {
  it('somme rejets/acceptations et compte les courses tentées', () => {
    const s = computeStats({ a: { rej: 3, acc: 0 }, b: { rej: 1, acc: 1 }, c: { rej: 0, acc: 0 } })
    expect(s.totalRej).toBe(4)
    expect(s.totalAcc).toBe(1)
    expect(s.totalAttempts).toBe(5)
    expect(s.triedCount).toBe(2)
    expect(s.profile).toBe('someAccepted')
  })
  it('profils allRejected / nothingYet', () => {
    expect(computeStats({ a: { rej: 2, acc: 0 } }).profile).toBe('allRejected')
    expect(computeStats({}).profile).toBe('nothingYet')
  })
  it('ignore les valeurs négatives ou absentes', () => {
    const s = computeStats({ a: { rej: -2, acc: 1 }, b: null })
    expect(s.totalRej).toBe(0)
    expect(s.totalAcc).toBe(1)
  })
})

describe('luckLabel', () => {
  it('affiche — sans tentative, 0.0% sans acceptation, sinon un pourcentage', () => {
    expect(luckLabel(computeStats({}))).toBe('—')
    expect(luckLabel(computeStats({ a: { rej: 5, acc: 0 } }))).toBe('0.0%')
    expect(luckLabel(computeStats({ a: { rej: 9, acc: 1 } }))).toBe('10%')
    expect(luckLabel(computeStats({ a: { rej: 19, acc: 1 } }))).toBe('5.0%')
  })
})

describe('pick', () => {
  it('est déterministe pour (seed, salt) et varie avec le seed', () => {
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(pick(arr, 7, 'x')).toBe(pick(arr, 7, 'x'))
    const draws = new Set(Array.from({ length: 30 }, (_, i) => pick(arr, i, 'x')))
    expect(draws.size).toBeGreaterThan(1)
    expect(pick([], 1, 'x')).toBe('')
    expect(pick(null, 1, 'x')).toBe('')
  })
})

describe('makeDistinctPicker', () => {
  it('ne répète pas une ligne tant que le paquet n’est pas épuisé', () => {
    const arr = ['a', 'b', 'c', 'd']
    const picker = makeDistinctPicker()
    const drawn = ['r1', 'r2', 'r3', 'r4'].map((id) => picker(arr, 5, id, 'bucket'))
    expect(new Set(drawn).size).toBe(4)
  })
  it('reprend les répétitions une fois le paquet épuisé (jamais de boucle infinie)', () => {
    const arr = ['a', 'b']
    const picker = makeDistinctPicker()
    const drawn = ['r1', 'r2', 'r3'].map((id) => picker(arr, 1, id, 'bucket'))
    expect(drawn).toHaveLength(3)
    drawn.forEach((d) => expect(arr).toContain(d))
  })
  it('les paquets sont indépendants et la liste vide rend une chaîne vide', () => {
    const picker = makeDistinctPicker()
    expect(picker(['x'], 1, 'r1', 'b1')).toBe('x')
    expect(picker(['x'], 1, 'r1', 'b2')).toBe('x')
    expect(picker([], 1, 'r1', 'b3')).toBe('')
  })
})

describe('pickTitle', () => {
  const titles = [
    { profile: 'allRejected', minRejections: 1, title: 'T1' },
    { profile: 'allRejected', minRejections: 4, title: 'T4' },
    { profile: 'allRejected', minRejections: 8, title: 'T8' },
    { profile: 'someAccepted', minRejections: 0, title: 'W0' },
    { profile: 'nothingYet', minRejections: 0, title: 'N' },
  ]
  it('prend le palier le plus élevé atteint pour le profil', () => {
    expect(pickTitle(titles, { profile: 'allRejected', totalRej: 5 }, 1).title).toBe('T4')
    expect(pickTitle(titles, { profile: 'allRejected', totalRej: 20 }, 1).title).toBe('T8')
    expect(pickTitle(titles, { profile: 'someAccepted', totalRej: 0 }, 1).title).toBe('W0')
    expect(pickTitle(titles, { profile: 'nothingYet', totalRej: 0 }, 1).title).toBe('N')
  })
  it('repli sûr si aucun titre ne correspond', () => {
    expect(pickTitle([], { profile: 'allRejected', totalRej: 2 }, 1).title).toBeTruthy()
  })
})
