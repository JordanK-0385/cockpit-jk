// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildApiMessages, MAX_TURNS, type Msg } from '../../src/lib/chat-messages'

describe('buildApiMessages — UI state → Anthropic ChatMessage[]', () => {
  // === The bug from 2026-05-11 ===
  // The API returned 400 "First message must be from user" because the
  // synthetic greeting (a `claude` message rendered for UX only) was
  // being included in the payload, putting an assistant turn first.
  // This is the guarantee buildApiMessages exists to protect.
  it('strips the synthetic greeting so the payload starts with user (regression: bug du 11 mai)', () => {
    const greeting: Msg = {
      id: 'greet-1',
      role: 'claude',
      synthetic: true,
      text: 'Bonjour Jordan, Sprint 2 étape 1 est en place…',
    }

    const result = buildApiMessages([greeting], 'Salut Claude')

    expect(result[0].role).toBe('user')
    expect(result).toEqual([{ role: 'user', content: 'Salut Claude' }])
  })

  it('strips any leading assistant turn so the payload always starts with user', () => {
    // Even without a synthetic flag, a stray leading assistant message
    // (theoretical, e.g. corrupted state) must be dropped — the while
    // loop in buildApiMessages is the last line of defense.
    const orphanAssistant: Msg = { id: 'a1', role: 'claude', text: 'leftover' }
    const realUser: Msg = { id: 'u1', role: 'user', text: 'real question' }

    const result = buildApiMessages([orphanAssistant, realUser], 'follow-up')

    expect(result[0].role).toBe('user')
    expect(result).toEqual([
      { role: 'user', content: 'real question' },
      { role: 'user', content: 'follow-up' },
    ])
  })

  it('maps a normal alternating history to user/assistant turns ending with the new user text', () => {
    const history: Msg[] = [
      { id: 'u1', role: 'user', text: 'Première question' },
      { id: 'c1', role: 'claude', text: 'Première réponse' },
      { id: 'u2', role: 'user', text: 'Deuxième question' },
      { id: 'c2', role: 'claude', text: 'Deuxième réponse' },
    ]

    const result = buildApiMessages(history, 'Troisième question')

    expect(result).toEqual([
      { role: 'user', content: 'Première question' },
      { role: 'assistant', content: 'Première réponse' },
      { role: 'user', content: 'Deuxième question' },
      { role: 'assistant', content: 'Deuxième réponse' },
      { role: 'user', content: 'Troisième question' },
    ])
  })

  it('excludes UI-only artifacts: suggestions, synthetic claude messages, and empty streaming placeholders', () => {
    const messages: Msg[] = [
      { id: 'sugg-1', role: 'suggestion', text: 'Quelle est ta priorité ?' },
      { id: 'greet', role: 'claude', synthetic: true, text: 'Bonjour' },
      { id: 'u1', role: 'user', text: 'Ma question' },
      { id: 'c-empty', role: 'claude', text: '', streaming: true }, // placeholder never filled
      { id: 'c-real', role: 'claude', text: 'Ma réponse' },
    ]

    const result = buildApiMessages(messages, 'Suite')

    expect(result).toEqual([
      { role: 'user', content: 'Ma question' },
      { role: 'assistant', content: 'Ma réponse' },
      { role: 'user', content: 'Suite' },
    ])
  })

  it('returns just the new user message when the history is empty', () => {
    expect(buildApiMessages([], 'Premier message')).toEqual([
      { role: 'user', content: 'Premier message' },
    ])
  })

  // === Garde-fou coût (Sprint 2 étape 3) ===
  // L'affichage garde tout l'historique, mais l'envoi API est borné aux
  // MAX_TURNS derniers tours pour éviter une facture qui gonfle à chaque
  // message sur une longue conversation persistée.
  it('caps the API payload to the last MAX_TURNS turns, dropping the oldest', () => {
    const history: Msg[] = []
    for (let i = 1; i <= MAX_TURNS + 2; i++) {
      history.push({ id: `u${i}`, role: 'user', text: `u${i}` })
      history.push({ id: `c${i}`, role: 'claude', text: `c${i}` })
    }

    const result = buildApiMessages(history, 'nouveau')

    // MAX_TURNS paires conservées (= MAX_TURNS*2 messages) + le nouveau user.
    expect(result).toHaveLength(MAX_TURNS * 2 + 1)
    // Les 2 tours les plus anciens (u1,c1,u2,c2) sont coupés → début à u3.
    expect(result[0]).toEqual({ role: 'user', content: 'u3' })
    expect(result.some((m) => m.content === 'u1')).toBe(false)
    expect(result.some((m) => m.content === 'c2')).toBe(false)
    // Se termine toujours par le nouveau message user.
    expect(result[result.length - 1]).toEqual({ role: 'user', content: 'nouveau' })
  })

  it('still starts with a user turn after capping mid-pair', () => {
    // Si la coupe tombe sur un assistant en tête, le strip défensif le retire.
    const history: Msg[] = []
    for (let i = 1; i <= MAX_TURNS + 5; i++) {
      history.push({ id: `u${i}`, role: 'user', text: `u${i}` })
      history.push({ id: `c${i}`, role: 'claude', text: `c${i}` })
    }
    const result = buildApiMessages(history, 'suite')
    expect(result[0].role).toBe('user')
  })
})
