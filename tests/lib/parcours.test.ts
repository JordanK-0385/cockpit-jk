import { describe, it, expect } from 'vitest'
import { buildParcours, nextTheme, XP_PER_CORRECT, REVIEW_DAYS } from '../../src/lib/parcours'
import type { Sujet } from '../../src/lib/apprentissage'
import type { QuizAttempt } from '../../src/lib/quiz-stats'

function sujet(id: string, niveau: string, ordre: number): Sujet {
  return { id, theme: `T-${id}`, domaine: 'LLM', niveau, angle: '', source: '', referentiels: [], priorite: '', ordre }
}
const DAY = 24 * 60 * 60 * 1000
function attempt(sujetId: string, p: number, score = 5, ageDays = 0): QuizAttempt {
  return {
    id: `a-${Math.random()}`, sujetId, sujet: `T-${sujetId}`, niveau: 'Débutant',
    score, total: 5, pct: p, trace: '', createdAt: Date.now() - ageDays * DAY,
  }
}

const sujets: Sujet[] = [
  sujet('d1', 'Débutant', 1),
  sujet('d2', 'Débutant', 2),
  sujet('i1', 'Intermédiaire', 3),
  sujet('a1', 'Avancé', 4),
]

describe('buildParcours', () => {
  it('Débutant courant, suite verrouillée au départ', () => {
    const p = buildParcours(sujets, [])
    expect(p.levels.find((l) => l.niveau === 'Débutant')!.state).toBe('current')
    expect(p.levels.find((l) => l.niveau === 'Intermédiaire')!.state).toBe('locked')
    expect(p.currentNiveau).toBe('Débutant')
  })

  it('validé seulement si le DERNIER essai est à 100 %', () => {
    const p = buildParcours(sujets, [attempt('d1', 80, 4)])
    expect(p.levels[0].themes.find((t) => t.sujet.id === 'd1')!.validated).toBe(false)
  })

  it('anti-oubli : un échec APRÈS un 100 % dé-valide le thème', () => {
    // ordre desc : le plus récent (80%) d'abord, puis l'ancien 100%
    const p = buildParcours(sujets, [attempt('d1', 80, 4, 0), attempt('d1', 100, 5, 3)])
    expect(p.levels[0].themes.find((t) => t.sujet.id === 'd1')!.validated).toBe(false)
  })

  it('un 100 % ancien reste validé mais passe « à réviser »', () => {
    const p = buildParcours(sujets, [attempt('d1', 100, 5, REVIEW_DAYS + 1)])
    const t = p.levels[0].themes.find((x) => x.sujet.id === 'd1')!
    expect(t.validated).toBe(true)
    expect(t.dueForReview).toBe(true)
    expect(p.reviewCount).toBe(1)
  })

  it('niveau acquis quand TOUS validés → débloque le suivant + badge', () => {
    const p = buildParcours(sujets, [attempt('d1', 100), attempt('d2', 100)])
    expect(p.levels.find((l) => l.niveau === 'Débutant')!.acquired).toBe(true)
    expect(p.levels.find((l) => l.niveau === 'Intermédiaire')!.state).toBe('current')
    expect(p.badges).toEqual(['Débutant'])
  })

  it('XP = somme des bonnes réponses × XP_PER_CORRECT', () => {
    const p = buildParcours(sujets, [attempt('d1', 100, 5), attempt('d2', 60, 3)])
    expect(p.totalXp).toBe((5 + 3) * XP_PER_CORRECT)
  })
})

describe('nextTheme', () => {
  it('renvoie le premier thème non validé du niveau courant', () => {
    const p = buildParcours(sujets, [attempt('d1', 100)])
    expect(nextTheme(p)!.sujet.id).toBe('d2')
  })
  it('à défaut, propose un thème à réviser', () => {
    const p = buildParcours(sujets, [attempt('d1', 100, 5, REVIEW_DAYS + 1), attempt('d2', 100)])
    // Débutant acquis (les 2 validés) → courant = Intermédiaire (i1 non joué)
    expect(nextTheme(p)!.sujet.id).toBe('i1')
  })
})
