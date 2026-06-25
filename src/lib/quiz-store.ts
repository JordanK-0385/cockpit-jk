import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { QuizAttempt } from './quiz-stats'

/**
 * Module Apprendre — persistance Firestore des scores, CÔTÉ CLIENT via le SDK
 * déjà initialisé (getDb), comme chat-store.ts. Pas d'endpoint, pas de secret.
 *
 * Modèle : collection users/{uid}/apprentissage_scores, un document par
 * tentative (time-series) : { sujetId, sujet, niveau, score, total, pct,
 * trace, createdAt: serverTimestamp() }. Le time-series alimente la courbe de
 * progression (incrément 2) ; l'agrégat par sujet est dérivé côté client.
 */

function attemptsCol(uid: string) {
  return collection(getDb(), 'users', uid, 'apprentissage_scores')
}

export type NewAttempt = Omit<QuizAttempt, 'id' | 'createdAt'>

export async function saveAttempt(uid: string, a: NewAttempt): Promise<void> {
  await addDoc(attemptsCol(uid), {
    sujetId: a.sujetId,
    sujet: a.sujet,
    niveau: a.niveau,
    score: a.score,
    total: a.total,
    pct: a.pct,
    trace: a.trace,
    createdAt: serverTimestamp(),
  })
}

export async function loadAttempts(uid: string, max = 200): Promise<QuizAttempt[]> {
  const q = query(attemptsCol(uid), orderBy('createdAt', 'desc'), limit(max))
  const snap = await getDocs(q)

  const out: QuizAttempt[] = []
  snap.forEach((doc) => {
    const d = doc.data() as Record<string, unknown>
    const ts = d.createdAt as { toMillis?: () => number } | undefined
    out.push({
      id: doc.id,
      sujetId: typeof d.sujetId === 'string' ? d.sujetId : '',
      sujet: typeof d.sujet === 'string' ? d.sujet : '—',
      niveau: typeof d.niveau === 'string' ? d.niveau : '',
      score: typeof d.score === 'number' ? d.score : 0,
      total: typeof d.total === 'number' ? d.total : 0,
      pct: typeof d.pct === 'number' ? d.pct : 0,
      trace: typeof d.trace === 'string' ? d.trace : '',
      createdAt: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null,
    })
  })
  return out
}
