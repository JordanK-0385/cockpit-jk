import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type { Msg } from './chat-messages'

/**
 * Sprint 2 — Étape 3 : persistance Firestore de l'historique de chat,
 * CÔTÉ CLIENT via le SDK déjà initialisé (getDb). Pas d'endpoint serveur,
 * pas de secret.
 *
 * Modèle de données : collection users/{uid}/messages, un document par tour
 * réel : { role: 'user' | 'claude', text: string, createdAt: serverTimestamp() }.
 * Conversation unique (pas de multi-thread) pour cette v1.
 *
 * Tous les appels firebase/firestore sont isolés ici pour que le mapping et le
 * filtrage soient testables en mockant ce module.
 */

// Seuls les vrais tours sont persistés : les artefacts UI (suggestion, greeting
// synthétique, placeholders de stream) ne touchent jamais Firestore.
type PersistedRole = 'user' | 'claude'

function messagesCol(uid: string) {
  return collection(getDb(), 'users', uid, 'messages')
}

// Id local stable pour les clés React, dérivé de l'id du document Firestore.
function localId(docId: string): string {
  return `fs_${docId}`
}

/**
 * Lit users/{uid}/messages trié par createdAt asc et mappe vers Msg[].
 * Ne charge QUE les tours user/claude (défense en profondeur : tout autre
 * role est ignoré).
 */
export async function loadHistory(uid: string): Promise<Msg[]> {
  const q = query(messagesCol(uid), orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)

  const out: Msg[] = []
  snap.forEach((doc) => {
    const data = doc.data()
    const role = data.role
    if (role !== 'user' && role !== 'claude') return
    const text = typeof data.text === 'string' ? data.text : ''
    const id = localId(doc.id)
    if (role === 'user') out.push({ id, role: 'user', text })
    else out.push({ id, role: 'claude', text })
  })
  return out
}

/**
 * Persiste un tour complet : 2 documents (user puis claude) avec
 * serverTimestamp(). N'écrit RIEN si claudeText est vide (tour interrompu ou
 * en erreur) — sinon la conversation se désaligne (un user sans réponse).
 */
export async function saveTurn(
  uid: string,
  userText: string,
  claudeText: string,
): Promise<void> {
  if (claudeText.trim() === '') return

  const col = messagesCol(uid)
  await addDoc(col, makeDoc('user', userText))
  await addDoc(col, makeDoc('claude', claudeText))
}

function makeDoc(role: PersistedRole, text: string) {
  return { role, text, createdAt: serverTimestamp() }
}

/**
 * Supprime tout l'historique de l'utilisateur. Fourni pour usage futur
 * (reset de conversation) — pas câblé à l'UI dans cette itération.
 */
export async function clearHistory(uid: string): Promise<void> {
  const snap = await getDocs(messagesCol(uid))
  await Promise.all(snap.docs.map((doc) => deleteDoc(doc.ref)))
}
