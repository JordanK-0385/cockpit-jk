// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildAnthropicPayload,
  MODEL,
  MAX_TOKENS,
  SYSTEM_PROMPT,
  type ClientMessage,
} from '../../api/_lib/anthropic'

describe('buildAnthropicPayload — ClientMessage[] → Anthropic stream payload', () => {
  it('returns the default model, max_tokens, system prompt and a 1:1 messages mapping', () => {
    const messages: ClientMessage[] = [
      { role: 'user', content: 'Salut Claude' },
      { role: 'assistant', content: 'Salut Jordan' },
      { role: 'user', content: 'Aide-moi avec le sprint' },
    ]

    const payload = buildAnthropicPayload(messages)

    expect(payload.model).toBe(MODEL)
    expect(payload.max_tokens).toBe(MAX_TOKENS)
    expect(payload.system).toBe(SYSTEM_PROMPT)
    expect(payload.messages).toEqual([
      { role: 'user', content: 'Salut Claude' },
      { role: 'assistant', content: 'Salut Jordan' },
      { role: 'user', content: 'Aide-moi avec le sprint' },
    ])
  })

  it('omits tools when none are provided', () => {
    const payload = buildAnthropicPayload([{ role: 'user', content: 'hi' }])
    expect(payload.tools).toBeUndefined()
  })

  it('passes through opts.tools when provided', () => {
    const tools = [
      {
        name: 'create_task',
        description: 'demo',
        input_schema: { type: 'object' as const, properties: {} },
      },
    ]
    const payload = buildAnthropicPayload([{ role: 'user', content: 'hi' }], { tools })
    expect(payload.tools).toBe(tools)
  })

  it('honors opts overrides and returns a fresh messages array (no shared reference)', () => {
    const messages: ClientMessage[] = [{ role: 'user', content: 'hello' }]

    const payload = buildAnthropicPayload(messages, {
      model: 'test-model',
      maxTokens: 42,
      system: 'test system',
    })

    expect(payload.model).toBe('test-model')
    expect(payload.max_tokens).toBe(42)
    expect(payload.system).toBe('test system')
    expect(payload.messages).not.toBe(messages)
    expect(payload.messages[0]).not.toBe(messages[0])
    expect(payload.messages[0]).toEqual({ role: 'user', content: 'hello' })
  })
})
