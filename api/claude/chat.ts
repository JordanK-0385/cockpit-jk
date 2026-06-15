import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth.js'
import { buildAnthropicPayload, type ClientMessage } from '../_lib/anthropic.js'
import { buildSystemPrompt } from '../_lib/context/systemPrompt.js'
import { runTool, toolSchemas } from '../_lib/tools/registry.js'

// Anti-boucle / Denial-of-Wallet : nombre maxi de tours tool-use avant stop
// forcé. Au-delà, on arrête sans exécuter les tools du dernier tour.
const MAX_TOOL_ITERATIONS = 5

/**
 * Sprint 2 — Étape 4 : le system prompt est reconstruit à chaque message via
 * buildSystemPrompt() (identité + temporel + contexte Airtable + sessions).
 * Tool use (étape 5+) et persistance Firestore (étape 3) viennent après.
 *
 * Wire format (custom SSE, parsed by src/lib/chat.ts):
 *   data: {"type":"text","text":"..."}\n\n      → token delta
 *   data: {"type":"done","stopReason":"end_turn","usage":{...}}\n\n
 *   data: {"type":"error","error":"..."}\n\n
 *
 * The Anthropic SDK's own event shape isn't passed through — the client
 * only needs deltas + a terminal marker, so we keep the wire small.
 */

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

  // Build the Airtable-aware system prompt before committing to SSE: the
  // up-to-4s context read happens here, not as silence on an open stream.
  // buildSystemPrompt() never throws (internal fallback), so no 500 risk.
  const system = await buildSystemPrompt()

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
    // Base payload (model, max_tokens, system, tools). Les messages sont
    // remplacés à chaque tour par la conversation interne qui, elle, peut
    // porter des blocs tool_use / tool_result (pas juste des strings).
    const basePayload = buildAnthropicPayload(messages, { system, tools: toolSchemas })
    const convo: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    let final: Anthropic.Message
    let iterations = 0

    // Boucle tool-use : on stream, et tant que le modèle demande un tool on
    // l'exécute via l'allowlist, on renvoie les tool_result, et on re-stream.
    for (;;) {
      const stream = client.messages.stream(
        { ...basePayload, messages: convo },
        { signal: abort.signal },
      )

      stream.on('text', (delta) => {
        if (!delta) return
        sseWrite(res, { type: 'text', text: delta })
      })

      final = await stream.finalMessage()

      if (final.stop_reason !== 'tool_use') break
      // Cap atteint : stop forcé, on n'exécute pas les tools de ce tour.
      if (iterations >= MAX_TOOL_ITERATIONS) break
      iterations++

      // L'assistant a produit un (ou plusieurs) bloc(s) tool_use : on les
      // rejoue à l'identique dans la conversation, puis on append les résultats.
      convo.push({ role: 'assistant', content: final.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of final.content) {
        if (block.type !== 'tool_use') continue
        // Event SSE non bloquant : le front peut afficher « écriture en cours… ».
        sseWrite(res, { type: 'tool', name: block.name })
        const result = await runTool(block.name, block.input)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result.content,
          is_error: result.isError,
        })
      }
      convo.push({ role: 'user', content: toolResults })
    }

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
