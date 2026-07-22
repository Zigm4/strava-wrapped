import { describe, it, expect } from 'vitest'
import { bucketFor, computeStats, luckLabel, makeDistinctPicker, pick, pickTitle, sixStarProgress, sixStarTier } from './ballot.js'

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
  it('somme rejets/acceptations et compte les courses tentees', () => {
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
  it('ignore les valeurs negatives ou absentes, et le toggle fin seul ne compte pas comme tentative', () => {
    const s = computeStats({ a: { rej: -2, acc: 1 }, b: null, boston: { fin: true } })
    expect(s.totalRej).toBe(0)
    expect(s.totalAcc).toBe(1)
    expect(s.triedCount).toBe(1)
  })
})

describe('luckLabel', () => {
  it('affiche N/A sans tentative, 0.0% sans acceptation, sinon un pourcentage', () => {
    expect(luckLabel(computeStats({}))).toBe('N/A')
    expect(luckLabel(computeStats({ a: { rej: 5, acc: 0 } }))).toBe('0.0%')
    expect(luckLabel(computeStats({ a: { rej: 9, acc: 1 } }))).toBe('10%')
    expect(luckLabel(computeStats({ a: { rej: 19, acc: 1 } }))).toBe('5.0%')
  })
})

describe('pick', () => {
  it('est deterministe pour (seed, salt) et varie avec le seed', () => {
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(pick(arr, 7, 'x')).toBe(pick(arr, 7, 'x'))
    const draws = new Set(Array.from({ length: 30 }, (_, i) => pick(arr, i, 'x')))
    expect(draws.size).toBeGreaterThan(1)
    expect(pick([], 1, 'x')).toBe('')
    expect(pick(null, 1, 'x')).toBe('')
  })
})

describe('makeDistinctPicker', () => {
  it('ne repete pas une ligne tant que le paquet n’est pas epuise', () => {
    const arr = ['a', 'b', 'c', 'd']
    const picker = makeDistinctPicker()
    const drawn = ['r1', 'r2', 'r3', 'r4'].map((id) => picker(arr, 5, id, 'bucket'))
    expect(new Set(drawn).size).toBe(4)
  })
  it('reprend les repetitions une fois le paquet epuise (jamais de boucle infinie)', () => {
    const arr = ['a', 'b']
    const picker = makeDistinctPicker()
    const drawn = ['r1', 'r2', 'r3'].map((id) => picker(arr, 1, id, 'bucket'))
    expect(drawn).toHaveLength(3)
    drawn.forEach((d) => expect(arr).toContain(d))
  })
  it('les paquets sont independants et la liste vide rend une chaine vide', () => {
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
  it('prend le palier le plus eleve atteint pour le profil', () => {
    expect(pickTitle(titles, { profile: 'allRejected', totalRej: 5 }, 1).title).toBe('T4')
    expect(pickTitle(titles, { profile: 'allRejected', totalRej: 20 }, 1).title).toBe('T8')
    expect(pickTitle(titles, { profile: 'someAccepted', totalRej: 0 }, 1).title).toBe('W0')
    expect(pickTitle(titles, { profile: 'nothingYet', totalRej: 0 }, 1).title).toBe('N')
  })
  it('repli sur si aucun titre ne correspond', () => {
    expect(pickTitle([], { profile: 'allRejected', totalRej: 2 }, 1).title).toBeTruthy()
  })
})

describe('sixStarProgress', () => {
  it('compte les 6 classiques (dont Boston) et les etoiles bonus a part', () => {
    const p = sixStarProgress({
      tokyo: { rej: 2, acc: 1, fin: true },
      boston: { fin: true },
      nyc: { rej: 4, fin: false },
      sydney: { acc: 1, fin: true },
      capetown: { fin: true },
      shanghai: { fin: true }, // candidat : pas d'etoile
    })
    expect(p.stars).toBe(2)
    expect(p.bonus).toBe(2)
  })
  it('vide -> 0/0', () => {
    expect(sixStarProgress({})).toEqual({ stars: 0, bonus: 0 })
  })
})

describe('sixStarTier', () => {
  it('paliers 0 / 1-2 / 3-5 / 6', () => {
    expect(sixStarTier(0)).toBe('zero')
    expect(sixStarTier(1)).toBe('started')
    expect(sixStarTier(2)).toBe('started')
    expect(sixStarTier(3)).toBe('halfway')
    expect(sixStarTier(5)).toBe('halfway')
    expect(sixStarTier(6)).toBe('full')
  })
})
