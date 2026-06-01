import type { ChatMessage } from './chat'

/**
 * UI-side chat message model. Mixes real user/assistant turns with
 * UI-only artifacts (suggestions, synthetic greeting, streaming
 * placeholders) — `buildApiMessages` is the place that strips those
 * artifacts before the conversation hits the Anthropic API.
 */
export type Msg =
  // `synthetic` flags UI-only messages (greeting, error placeholders…)
  // that must NEVER be sent to the Anthropic API — they don't exist as
  // far as the conversation history is concerned.
  | { id: string; role: 'claude'; text: string; streaming?: boolean; synthetic?: boolean }
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'suggestion'; text: string }

/**
 * Build the Anthropic-bound payload from the UI state + the new user
 * text. Three guarantees:
 *   1. Suggestion bubbles and synthetic Claude messages (greeting,
 *      placeholders) are excluded — they're UI artifacts only.
 *   2. Empty Claude messages (streaming placeholders that never got
 *      any text) are dropped.
 *   3. The result always starts with a user message — defensive strip
 *      of any leading assistant turn, since the Anthropic API rejects
 *      conversations that don't begin with `user`.
 */
export function buildApiMessages(uiMessages: Msg[], newUserText: string): ChatMessage[] {
  const history: ChatMessage[] = []
  for (const m of uiMessages) {
    if (m.role === 'suggestion') continue
    if (m.role === 'claude' && m.synthetic) continue
    if (m.role === 'claude' && m.text.trim() === '') continue
    history.push({
      role: m.role === 'claude' ? 'assistant' : 'user',
      content: m.text,
    })
  }
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift()
  }
  return [...history, { role: 'user', content: newUserText }]
}
