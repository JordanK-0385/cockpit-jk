// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// On mocke entièrement firebase/firestore + le wrapper getDb : la logique
// testée ici est le mapping/filtrage et la garantie "rien d'écrit si le tour
// est incomplet", sans aucun appel réseau Firestore.
const {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} = vi.hoisted(() => ({
  collection: vi.fn((...args: unknown[]) => ({ __col: args })),
  query: vi.fn((...args: unknown[]) => ({ __query: args })),
  orderBy: vi.fn((field: string, dir: string) => ({ __orderBy: [field, dir] })),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => '__TS__'),
}))

vi.mock('firebase/firestore', () => ({
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
}))
vi.mock('@/lib/firebase', () => ({ getDb: vi.fn(() => ({ __db: true })) }))

import { loadHistory, saveTurn } from '@/lib/chat-store'

// Construit un faux QuerySnapshot itérable par forEach, comme Firestore.
function snapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) =>
      docs.forEach((d) => cb({ id: d.id, data: () => d.data })),
    docs: docs.map((d) => ({ id: d.id, ref: { __ref: d.id } })),
  }
}

beforeEach(() => {
  getDocs.mockReset()
  addDoc.mockReset()
  deleteDoc.mockReset()
  addDoc.mockResolvedValue({ id: 'newDoc' })
})

describe('loadHistory — Firestore docs → Msg[]', () => {
  it('mappe les tours user/claude triés et génère un id local', async () => {
    getDocs.mockResolvedValue(
      snapshot([
        { id: 'd1', data: { role: 'user', text: 'Ma question' } },
        { id: 'd2', data: { role: 'claude', text: 'Ma réponse' } },
      ]),
    )

    const msgs = await loadHistory('uid123')

    expect(msgs).toHaveLength(2)
    expect(msgs[0]).toMatchObject({ role: 'user', text: 'Ma question' })
    expect(msgs[1]).toMatchObject({ role: 'claude', text: 'Ma réponse' })
    expect(typeof msgs[0].id).toBe('string')
    expect(msgs[0].id).not.toBe(msgs[1].id)
    // Tri par createdAt asc demandé à Firestore.
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'asc')
  })

  it('filtre tout doc dont le role n’est pas user/claude (jamais de suggestion/synthetic)', async () => {
    getDocs.mockResolvedValue(
      snapshot([
        { id: 'd1', data: { role: 'user', text: 'Q' } },
        { id: 'd2', data: { role: 'suggestion', text: 'sugg parasite' } },
        { id: 'd3', data: { role: 'claude', text: 'R' } },
      ]),
    )

    const msgs = await loadHistory('uid123')

    expect(msgs.map((m) => m.role)).toEqual(['user', 'claude'])
    expect(msgs.some((m) => m.text === 'sugg parasite')).toBe(false)
  })
})

describe('saveTurn — persistance d’un tour complet uniquement', () => {
  it('écrit 2 documents (user puis claude) avec serverTimestamp quand le tour est complet', async () => {
    await saveTurn('uid123', 'Question', 'Réponse')

    expect(addDoc).toHaveBeenCalledTimes(2)
    const first = addDoc.mock.calls[0][1]
    const second = addDoc.mock.calls[1][1]
    expect(first).toMatchObject({ role: 'user', text: 'Question', createdAt: '__TS__' })
    expect(second).toMatchObject({ role: 'claude', text: 'Réponse', createdAt: '__TS__' })
  })

  it('n’écrit RIEN si le texte Claude est vide (tour interrompu) — pas de désalignement', async () => {
    await saveTurn('uid123', 'Question', '')
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('n’écrit RIEN si le texte Claude est seulement des espaces', async () => {
    await saveTurn('uid123', 'Question', '   \n  ')
    expect(addDoc).not.toHaveBeenCalled()
  })
})
