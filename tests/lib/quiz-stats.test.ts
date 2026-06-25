import { describe, it, expect } from 'vitest'
import { aggregateBySubject, pct, type QuizAttempt } from '../../src/lib/quiz-stats'

function attempt(p: Partial<QuizAttempt>): QuizAttempt {
  return {
    id: Math.random().toString(36).slice(2),
    sujetId: 's1',
    sujet: 'Sujet 1',
    niveau: 'Intermédiaire',
    score: 4,
    total: 5,
    pct: 80,
    trace: '',
    createdAt: Date.now(),
    ...p,
  }
}

describe('pct', () => {
  it('calcule un pourcentage entier', () => {
    expect(pct(4, 5)).toBe(80)
    expect(pct(0, 5)).toBe(0)
    expect(pct(1, 3)).toBe(33)
  })
  it('protège la division par zéro', () => {
    expect(pct(2, 0)).toBe(0)
  })
})

describe('aggregateBySubject', () => {
  it('agrège meilleur %, dernier % et nombre de tentatives (liste desc)', () => {
    // Ordre desc par date : la première est la plus récente.
    const attempts: QuizAttempt[] = [
      attempt({ sujetId: 's1', pct: 60 }), // plus récente
      attempt({ sujetId: 's1', pct: 100 }),
      attempt({ sujetId: 's1', pct: 40 }),
    ]
    const stats = aggregateBySubject(attempts)
    expect(stats).toHaveLength(1)
    expect(stats[0].attempts).toBe(3)
    expect(stats[0].bestPct).toBe(100)
    expect(stats[0].lastPct).toBe(60)
  })

  it('trie les sujets par meilleur % décroissant', () => {
    const stats = aggregateBySubject([
      attempt({ sujetId: 'a', sujet: 'A', pct: 50 }),
      attempt({ sujetId: 'b', sujet: 'B', pct: 90 }),
    ])
    expect(stats.map((s) => s.sujet)).toEqual(['B', 'A'])
  })

  it('regroupe par libellé si sujetId absent', () => {
    const stats = aggregateBySubject([
      attempt({ sujetId: '', sujet: 'Libre', pct: 70 }),
      attempt({ sujetId: '', sujet: 'Libre', pct: 30 }),
    ])
    expect(stats).toHaveLength(1)
    expect(stats[0].attempts).toBe(2)
  })
})
