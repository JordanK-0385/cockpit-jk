/**
 * Module Apprendre — types et agrégations PURES des scores (aucune dépendance
 * Firebase). Isolé pour être testable en node, comme api/_lib.
 */

export type QuizAttempt = {
  id: string
  sujetId: string
  sujet: string
  niveau: string
  score: number
  total: number
  pct: number
  /** Trace (livrable) saisie en fin de session — méthode JK en 4 temps. */
  trace: string
  /** Epoch ms, ou null si le serverTimestamp n'est pas encore résolu. */
  createdAt: number | null
}

export type SubjectStat = {
  sujetId: string
  sujet: string
  bestPct: number
  lastPct: number
  attempts: number
}

/**
 * Agrège une liste de tentatives (supposée triée du plus récent au plus ancien)
 * par sujet : meilleur %, dernier %, nombre de tentatives. Trié par meilleur %
 * décroissant.
 */
export function aggregateBySubject(attempts: QuizAttempt[]): SubjectStat[] {
  const map = new Map<string, SubjectStat>()
  for (const a of attempts) {
    const key = a.sujetId || a.sujet
    const cur = map.get(key)
    if (!cur) {
      // Premier vu = le plus récent (liste desc) → fixe lastPct.
      map.set(key, {
        sujetId: a.sujetId,
        sujet: a.sujet,
        bestPct: a.pct,
        lastPct: a.pct,
        attempts: 1,
      })
    } else {
      cur.attempts += 1
      cur.bestPct = Math.max(cur.bestPct, a.pct)
    }
  }
  return [...map.values()].sort((x, y) => y.bestPct - x.bestPct)
}

/** Pourcentage entier d'un score brut. */
export function pct(score: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((score / total) * 100)
}
