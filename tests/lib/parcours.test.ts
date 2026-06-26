import { describe, it, expect } from 'vitest'
import { buildParcours, XP_PER_CORRECT } from '../../src/lib/parcours'
import type { Sujet } from '../../src/lib/apprentissage'
import type { QuizAttempt } from '../../src/lib/quiz-stats'

function sujet(id: string, niveau: string, ordre: number): Sujet {
  return {
    id,
    theme: `T-${id}`,
    domaine: 'LLM',
    niveau,
    angle: '',
    source: '',
    referentiels: [],
    priorite: '',
    ordre,
  }
}

function attempt(sujetId: string, p: number, score = 5): QuizAttempt {
  return {
    id: `a-${Math.random()}`,
    sujetId,
    sujet: `T-${sujetId}`,
    niveau: 'Débutant',
    score,
    total: 5,
    pct: p,
    trace: '',
    createdAt: Date.now(),
  }
}

const sujets: Sujet[] = [
  sujet('d1', 'Débutant', 1),
  sujet('d2', 'Débutant', 2),
  sujet('i1', 'Intermédiaire', 3),
  sujet('a1', 'Avancé', 4),
]

describe('buildParcours', () => {
  it('Débutant courant et verrous tant que rien n’est validé', () => {
    const p = buildParcours(sujets, [])
    const deb = p.levels.find((l) => l.niveau === 'Débutant')!
    const inter = p.levels.find((l) => l.niveau === 'Intermédiaire')!
    expect(deb.state).toBe('current')
    expect(inter.state).toBe('locked')
    expect(p.currentNiveau).toBe('Débutant')
    expect(p.badges).toEqual([])
  })

  it('un thème est validé seulement à 100 %', () => {
    const p = buildParcours(sujets, [attempt('d1', 80, 4)])
    const deb = p.levels.find((l) => l.niveau === 'Débutant')!
    expect(deb.themes.find((t) => t.sujet.id === 'd1')!.validated).toBe(false)
    expect(deb.acquired).toBe(false)
  })

  it('niveau acquis quand TOUS les thèmes sont validés → débloque le suivant', () => {
    const p = buildParcours(sujets, [attempt('d1', 100), attempt('d2', 100)])
    const deb = p.levels.find((l) => l.niveau === 'Débutant')!
    const inter = p.levels.find((l) => l.niveau === 'Intermédiaire')!
    const avance = p.levels.find((l) => l.niveau === 'Avancé')!
    expect(deb.acquired).toBe(true)
    expect(deb.state).toBe('acquired')
    expect(inter.state).toBe('current')
    expect(avance.state).toBe('locked')
    expect(p.currentNiveau).toBe('Intermédiaire')
    expect(p.badges).toEqual(['Débutant'])
  })

  it('XP = somme des bonnes réponses × XP_PER_CORRECT', () => {
    const p = buildParcours(sujets, [attempt('d1', 100, 5), attempt('d2', 60, 3)])
    expect(p.totalXp).toBe((5 + 3) * XP_PER_CORRECT)
  })

  it('un thème partiellement validé bloque encore le niveau', () => {
    const p = buildParcours(sujets, [attempt('d1', 100)])
    const deb = p.levels.find((l) => l.niveau === 'Débutant')!
    expect(deb.validatedCount).toBe(1)
    expect(deb.total).toBe(2)
    expect(deb.acquired).toBe(false)
    expect(p.levels.find((l) => l.niveau === 'Intermédiaire')!.state).toBe('locked')
  })
})
