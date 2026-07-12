import { getFirestore } from 'firebase-admin/firestore'
import { getAdmin } from './auth.js'
import type { N8nReviewCache } from '../../src/lib/n8n-types.js'

/**
 * Cache Firestore des analyses IA du Monitoring (lots E & F).
 *
 * Écrit ET lu côté serveur via firebase-admin (bypass des règles Firestore) :
 * le client ne lit jamais Firestore ici, il reçoit le cache dans la réponse de
 * `GET /api/n8n/workflows`. Un seul document par utilisateur.
 */
const COLLECTION = 'monitoringAi'

function docRef(uid: string) {
  return getFirestore(getAdmin()).collection(COLLECTION).doc(uid)
}

export async function readReviewCache(uid: string): Promise<N8nReviewCache | null> {
  try {
    const snap = await docRef(uid).get()
    if (!snap.exists) return null
    return (snap.data() as N8nReviewCache) ?? null
  } catch {
    // Cache indisponible (Firestore down / non configuré) : dégrade sans casser
    // le Monitoring — l'IA est un bonus, pas un bloquant.
    return null
  }
}

export async function writeReviewCache(uid: string, cache: N8nReviewCache): Promise<void> {
  await docRef(uid).set(cache)
}
