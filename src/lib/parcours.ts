import type { Sujet } from './apprentissage'
import type { QuizAttempt } from './quiz-stats'

/**
 * Module Apprendre — moteur de progression du parcours (PUR, testable).
 *
 * Règles (mode exigeant validé par Jordan) + anti-oubli (v5) :
 *   - un THÈME est « validé » si le DERNIER QCM passé est à 100 % (sans faute).
 *     → si on le repasse et qu'on le rate, il redevient non validé (anti-oubli).
 *   - un THÈME validé devient « à réviser » après REVIEW_DAYS jours sans
 *     repassage réussi : il reste validé mais on invite à le rejouer.
 *   - un NIVEAU est « acquis » quand TOUS ses thèmes sont validés ;
 *   - le niveau suivant se débloque quand le précédent est acquis.
 *
 * Tout est DÉRIVÉ des tentatives stockées (apprentissage_scores).
 */

export const NIVEAUX_ORDER = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'] as const
export type Niveau = (typeof NIVEAUX_ORDER)[number]

export const XP_PER_CORRECT = 4
export const VALIDATION_PCT = 100
// Délai au-delà duquel un thème validé passe « à réviser ».
export const REVIEW_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type ThemeProgress = {
  sujet: Sujet
  validated: boolean
  dueForReview: boolean
  bestPct: number
  lastPct: number
  attempts: number
}

export type LevelState = 'acquired' | 'current' | 'locked'

export type LevelProgress = {
  niveau: Niveau
  themes: ThemeProgress[]
  validatedCount: number
  total: number
  acquired: boolean
  state: LevelState
  xp: number
}

export type Parcours = {
  levels: LevelProgress[]
  totalXp: number
  currentNiveau: Niveau | null
  badges: Niveau[]
  reviewCount: number
}

function normNiveau(n: string): Niveau | null {
  return NIVEAUX_ORDER.find((x) => x.toLowerCase() === (n ?? '').toLowerCase()) ?? null
}

function daysSince(ms: number | null): number | null {
  if (ms === null) return null
  return Math.floor((Date.now() - ms) / MS_PER_DAY)
}

export function buildParcours(sujets: Sujet[], attempts: QuizAttempt[]): Parcours {
  // Index par sujetId. `attempts` est supposé trié du plus récent au plus ancien.
  const byTheme = new Map<string, QuizAttempt[]>()
  for (const a of attempts) {
    if (!a.sujetId) continue
    const arr = byTheme.get(a.sujetId) ?? []
    arr.push(a)
    byTheme.set(a.sujetId, arr)
  }

  const totalXp = attempts.reduce((sum, a) => sum + a.score * XP_PER_CORRECT, 0)

  const levels: LevelProgress[] = NIVEAUX_ORDER.map((niveau) => {
    const lvlSujets = sujets
      .filter((s) => normNiveau(s.niveau) === niveau)
      .sort((a, b) => a.ordre - b.ordre)

    const themes: ThemeProgress[] = lvlSujets.map((s) => {
      const ats = byTheme.get(s.id) ?? []
      const mostRecent = ats[0]
      const validated = !!mostRecent && mostRecent.pct >= VALIDATION_PCT
      const age = validated ? daysSince(mostRecent.createdAt ?? null) : null
      return {
        sujet: s,
        validated,
        dueForReview: validated && age !== null && age >= REVIEW_DAYS,
        bestPct: ats.reduce((m, a) => Math.max(m, a.pct), 0),
        lastPct: mostRecent?.pct ?? 0,
        attempts: ats.length,
      }
    })

    const validatedCount = themes.filter((t) => t.validated).length
    const total = themes.length
    const acquired = total > 0 && validatedCount === total
    const xp = themes.reduce((s, t) => {
      const ats = byTheme.get(t.sujet.id) ?? []
      return s + ats.reduce((x, a) => x + a.score * XP_PER_CORRECT, 0)
    }, 0)

    return { niveau, themes, validatedCount, total, acquired, state: 'locked' as LevelState, xp }
  })

  let currentNiveau: Niveau | null = null
  levels.forEach((lvl, i) => {
    const prevAllAcquired = levels.slice(0, i).every((l) => l.acquired)
    if (lvl.acquired) lvl.state = 'acquired'
    else if (prevAllAcquired) {
      lvl.state = 'current'
      if (!currentNiveau) currentNiveau = lvl.niveau
    } else lvl.state = 'locked'
  })

  const badges = levels.filter((l) => l.acquired).map((l) => l.niveau)
  const reviewCount = levels.reduce(
    (n, l) => n + l.themes.filter((t) => t.dueForReview).length,
    0,
  )

  return { levels, totalXp, currentNiveau, badges, reviewCount }
}

export function isThemePlayable(parcours: Parcours, niveau: string): boolean {
  const lvl = parcours.levels.find((l) => l.niveau === normNiveau(niveau))
  return !!lvl && lvl.state !== 'locked'
}

/**
 * Prochain thème conseillé pour le hero « Continuer » : le premier thème non
 * validé du niveau courant ; à défaut, le premier thème « à réviser ».
 */
export function nextTheme(parcours: Parcours): ThemeProgress | null {
  const current = parcours.levels.find((l) => l.state === 'current')
  if (current) {
    const todo = current.themes.find((t) => !t.validated)
    if (todo) return todo
  }
  for (const lvl of parcours.levels) {
    const due = lvl.themes.find((t) => t.dueForReview)
    if (due) return due
  }
  return null
}
