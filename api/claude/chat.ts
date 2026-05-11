import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth'

/**
 * Sprint 2 — Étape 1 : streaming chat backend (text only, no tools,
 * no Airtable context yet). Later étapes layer on system-prompt context
 * (étape 4), tool use (étape 5+), and persistence to Firestore (étape 3).
 *
 * Wire format (custom SSE, parsed by src/lib/chat.ts):
 *   data: {"type":"text","text":"..."}\n\n      → token delta
 *   data: {"type":"done","stopReason":"end_turn","usage":{...}}\n\n
 *   data: {"type":"error","error":"..."}\n\n
 *
 * The Anthropic SDK's own event shape isn't passed through — the client
 * only needs deltas + a terminal marker, so we keep the wire small.
 */

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5'
const MAX_TOKENS = 4096

// Minimal system prompt for étape 1. Étape 4 will rebuild this per-request
// with live Airtable context (projets, tâches du jour, focus, sessions).
const SYSTEM_PROMPT = `Tu es le collaborateur IA de Jordan Koskas, consultant IA indépendant chez JK Consulting (Neuilly-sur-Seine, France). Tu réponds en français, naturellement et brièvement. Tu es chaleureux mais direct, à l'aise avec la technique. Pour l'instant tu n'as pas encore accès aux données Airtable de Jordan — c'est l'étape suivante du Sprint 2.`

type ClientMessage = {
  role: 'user' | 'assistant'
  content: string
}

function sseWrite(res: VercelResponse, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStore(res)

  const auth = await requireAuthorizedUser(req, res)
  if (!auth) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server' })
    return
  }

  const body = req.body as { messages?: ClientMessage[] } | undefined
  const messages = body?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Body must include a non-empty messages array' })
    return
  }
  for (const m of messages) {
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      res.status(400).json({ error: 'Each message must be { role: "user"|"assistant", content: string }' })
      return
    }
  }
  if (messages[0].role !== 'user') {
    res.status(400).json({ error: 'First message must be from the user' })
    return
  }

  // SSE headers. X-Accel-Buffering: no prevents intermediate proxies (Vercel
  // edge, nginx) from buffering the response.
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  const client = new Anthropic({ apiKey })

  // If the client disconnects mid-stream, abort the upstream call.
  const abort = new AbortController()
  req.on('close', () => abort.abort())

  try {
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal: abort.signal },
    )

    stream.on('text', (delta) => {
      if (!delta) return
      sseWrite(res, { type: 'text', text: delta })
    })

    const final = await stream.finalMessage()

    sseWrite(res, {
      type: 'done',
      stopReason: final.stop_reason,
      usage: final.usage,
    })
    res.end()
  } catch (err) {
    if (abort.signal.aborted) {
      // Client disconnected — no need to write more.
      try { res.end() } catch { /* noop */ }
      return
    }
    const message =
      err instanceof Anthropic.APIError
        ? `${err.status ?? 'API'}: ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err)
    sseWrite(res, { type: 'error', error: message })
    try { res.end() } catch { /* noop */ }
  }
}
