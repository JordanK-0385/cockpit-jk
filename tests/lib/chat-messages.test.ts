// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildApiMessages, type Msg } from '../../src/lib/chat-messages'

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
})
