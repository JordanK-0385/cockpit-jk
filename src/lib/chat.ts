import { getIdToken } from './firebase'

/**
 * Sprint 2 — Étape 1 client helper. Streams a chat completion from
 * /api/claude/chat, calling `onText(delta)` for each token batch and
 * `onDone(meta)` once the stream is closed cleanly. Aborts via signal.
 *
 * The wire format is the custom SSE shape produced by api/claude/chat.ts.
 */

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type StreamUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export type StreamDone = {
  stopReason: string | null
  usage?: StreamUsage
}

export type StreamCallbacks = {
  onText: (delta: string) => void
  onDone?: (meta: StreamDone) => void
  onError?: (err: Error) => void
}

export type StreamOptions = StreamCallbacks & {
  signal?: AbortSignal
}

export async function streamChat(
  messages: ChatMessage[],
  opts: StreamOptions,
): Promise<void> {
  const token = await getIdToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/api/claude/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Chat request failed (${res.status}): ${text || res.statusText}`)
    opts.onError?.(err)
    throw err
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events as `data: <json>\n\n` blocks.
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)

        for (const line of raw.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload) continue
          let event: { type: string; [k: string]: unknown }
          try {
            event = JSON.parse(payload) as { type: string; [k: string]: unknown }
          } catch {
            continue
          }
          if (event.type === 'text' && typeof event.text === 'string') {
            opts.onText(event.text)
          } else if (event.type === 'done') {
            opts.onDone?.({
              stopReason: (event.stopReason as string | null) ?? null,
              usage: event.usage as StreamUsage | undefined,
            })
          } else if (event.type === 'error') {
            const err = new Error((event.error as string) || 'Upstream chat error')
            opts.onError?.(err)
            throw err
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
