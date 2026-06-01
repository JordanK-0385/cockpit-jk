export type ClientMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AnthropicPayload = {
  model: string
  max_tokens: number
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5'
export const MAX_TOKENS = 4096

// Étape 4 du Sprint 2 réécrira ce prompt par requête avec le contexte
// Airtable (projets, tâches du jour, focus, sessions).
export const SYSTEM_PROMPT = `Tu es le collaborateur IA de Jordan Koskas, consultant IA indépendant chez JK Consulting (Neuilly-sur-Seine, France). Tu réponds en français, naturellement et brièvement. Tu es chaleureux mais direct, à l'aise avec la technique. Pour l'instant tu n'as pas encore accès aux données Airtable de Jordan — c'est l'étape suivante du Sprint 2.`

/**
 * Pure mapping: client-facing messages → the payload object passed to
 * `client.messages.stream(...)`. No I/O, no SDK calls — just shape.
 *
 * `opts` lets callers override the defaults (used by tests; production
 * code calls this with no opts and gets MODEL/MAX_TOKENS/SYSTEM_PROMPT).
 */
export function buildAnthropicPayload(
  messages: ClientMessage[],
  opts: { model?: string; maxTokens?: number; system?: string } = {},
): AnthropicPayload {
  return {
    model: opts.model ?? MODEL,
    max_tokens: opts.maxTokens ?? MAX_TOKENS,
    system: opts.system ?? SYSTEM_PROMPT,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  }
}
