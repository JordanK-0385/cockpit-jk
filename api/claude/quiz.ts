import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth.js'
import {
  QUIZ_MODEL,
  QUIZ_MAX_TOKENS,
  QUIZ_SYSTEM_PROMPT,
  buildQuizUserPrompt,
  parseQuizResponse,
  clampCount,
} from '../_lib/quiz.js'

/**
 * Module Apprendre — génération de QCM à la volée (one-shot, non-streaming).
 *
 * Le client envoie { sujet, niveau, angle?, n? }. On demande à Sonnet n QCM
 * et on renvoie { questions: QuizQuestion[] }. Même garde-fou que les autres
 * routes : token Firebase dont l'email == AUTHORIZED_EMAIL ; clé Anthropic
 * jamais exposée au front.
 */
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

  const body = req.body as
    | { sujet?: unknown; niveau?: unknown; angle?: unknown; n?: unknown }
    | undefined
  const sujet = typeof body?.sujet === 'string' ? body.sujet.trim() : ''
  const niveau = typeof body?.niveau === 'string' ? body.niveau.trim() : ''
  if (!sujet || !niveau) {
    res.status(400).json({ error: 'Body must include non-empty { sujet, niveau }' })
    return
  }
  const angle = typeof body?.angle === 'string' ? body.angle : undefined
  const n = clampCount(typeof body?.n === 'number' ? body.n : undefined)

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: QUIZ_MODEL,
      max_tokens: QUIZ_MAX_TOKENS,
      system: QUIZ_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildQuizUserPrompt({ sujet, niveau, angle, n }) }],
    })
    const text = msg.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()

    let questions
    try {
      questions = parseQuizResponse(text)
    } catch (parseErr) {
      const detail = parseErr instanceof Error ? parseErr.message : String(parseErr)
      res.status(502).json({ error: `Quiz illisible : ${detail}` })
      return
    }
    res.status(200).json({ questions })
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `${err.status ?? 'API'}: ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err)
    res.status(502).json({ error: message })
  }
}
