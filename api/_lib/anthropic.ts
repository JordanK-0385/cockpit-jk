import type Anthropic from '@anthropic-ai/sdk'

export type ClientMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AnthropicPayload = {
  model: string
  max_tokens: number
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  tools?: Anthropic.Tool[]
}

export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5'
export const MAX_TOKENS = 4096

// Fallback system prompt — utilisé uniquement quand buildAnthropicPayload est
// appelé sans opts.system (tests unitaires). En production, chat.ts passe le
// prompt complet construit par buildSystemPrompt() (Sprint 2 étape 4).
export const SYSTEM_PROMPT = `Tu es le collaborateur IA de Jordan Koskas, consultant IA indépendant chez JK Consulting (Neuilly-sur-Seine, France). Tu réponds en français, naturellement et brièvement. Tu es chaleureux mais direct, à l'aise avec la technique.`

/**
 * Pure mapping: client-facing messages → the payload object passed to
 * `client.messages.stream(...)`. No I/O, no SDK calls — just shape.
 *
 * `opts` lets callers override the defaults (used by tests; production
 * code calls this with no opts and gets MODEL/MAX_TOKENS/SYSTEM_PROMPT).
 */
export function buildAnthropicPayload(
  messages: ClientMessage[],
  opts: { model?: string; maxTokens?: number; system?: string; tools?: Anthropic.Tool[] } = {},
): AnthropicPayload {
  const payload: AnthropicPayload = {
    model: opts.model ?? MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    system: opts.system ?? SYSTEM_PROMPT,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  }
  if (opts.tools && opts.tools.length > 0) payload.tools = opts.tools
  return payload
}
