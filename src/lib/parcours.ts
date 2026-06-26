import type { Sujet } from './apprentissage'
import type { QuizAttempt } from './quiz-stats'

/**
 * Module Apprendre — moteur de progression du parcours (PUR, testable).
 *
 * Le parcours est gaté par NIVEAU (Débutant → Expert). Règles validées par
 * Jordan (mode exigeant) :
 *   - un THÈME est « validé » dès qu'un QCM est réussi à 100 % (sans faute) ;
 *   - un NIVEAU est « acquis » quand TOUS ses thèmes sont validés ;
 *   - le niveau suivant se débloque seulement quand le précédent est acquis.
 *
 * Toute la progression est DÉRIVÉE des tentatives déjà stockées
 * (users/{uid}/apprentissage_scores) : aucun nouveau stockage, aucune règle
 * Firestore supplémentaire.
 */

export const NIVEAUX_ORDER = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'] as const
export type Niveau = (typeof NIVEAUX_ORDER)[number]

// XP par bonne réponse — récompense la pratique (cosmétique, le gate reste les thèmes).
export const XP_PER_CORRECT = 4
// Un thème est validé à ce pourcentage (sans-faute).
export const VALIDATION_PCT = 100

export type ThemeProgress = {
  sujet: Sujet
  validated: boolean
  bestPct: number
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
  /** XP gagnés sur les thèmes de ce niveau. */
  xp: number
}

export type Parcours = {
  levels: LevelProgress[]
  totalXp: number
  currentNiveau: Niveau | null
  badges: Niveau[]
}

function normNiveau(n: string): Niveau | null {
  const found = NIVEAUX_ORDER.find((x) => x.toLowerCase() === (n ?? '').toLowerCase())
  return found ?? null
}

/** Construit l'état complet du parcours à partir des sujets et des tentatives. */
export function buildParcours(sujets: Sujet[], attempts: QuizAttempt[]): Parcours {
  // Index des tentatives par sujetId.
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
      const bestPct = ats.reduce((m, a) => Math.max(m, a.pct), 0)
      return {
        sujet: s,
        validated: ats.some((a) => a.pct >= VALIDATION_PCT),
        bestPct,
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

  // États : un niveau est débloqué si tous les précédents sont acquis.
  let currentNiveau: Niveau | null = null
  levels.forEach((lvl, i) => {
    const prevAllAcquired = levels.slice(0, i).every((l) => l.acquired)
    if (lvl.acquired) {
      lvl.state = 'acquired'
    } else if (prevAllAcquired) {
      lvl.state = 'current'
      if (!currentNiveau) currentNiveau = lvl.niveau
    } else {
      lvl.state = 'locked'
    }
  })

  const badges = levels.filter((l) => l.acquired).map((l) => l.niveau)

  return { levels, totalXp, currentNiveau, badges }
}

/** Un thème est jouable si son niveau est débloqué (courant ou déjà acquis). */
export function isThemePlayable(parcours: Parcours, niveau: string): boolean {
  const lvl = parcours.levels.find((l) => l.niveau === normNiveau(niveau))
  return !!lvl && lvl.state !== 'locked'
}
