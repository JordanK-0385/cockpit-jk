import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth.js'

/**
 * « Focus du jour » — appel one-shot (non-streaming) au modèle Sonnet.
 *
 * Le client envoie la liste DÉJÀ chargée des projets « En cours » + leurs
 * tâches ouvertes ; on demande les 3 priorités du jour, tous projets confondus.
 * Distinct de /api/claude/chat (conversation SSE + tools) : ici, un seul tour,
 * system prompt dédié, réponse JSON simple { text }.
 *
 * Clé API jamais exposée au front : tout passe par cette fonction Vercel,
 * gardée par un token Firebase dont l'email == AUTHORIZED_EMAIL.
 */
const FOCUS_MODEL = process.env.CLAUDE_FOCUS_MODEL || 'claude-sonnet-4-6'
const MAX_TOKENS = 512

const SYSTEM_PROMPT =
  "À partir de ces projets et tâches, donne les 3 actions à prioriser aujourd'hui, tous projets confondus. Réponds en 3 puces concises."

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

  const body = req.body as { projects?: unknown } | undefined
  if (!body || !Array.isArray(body.projects)) {
    res.status(400).json({ error: 'Body must include a non-empty projects array' })
    return
  }
  if (body.projects.length === 0) {
    res.status(200).json({ text: 'Aucun projet en cours — rien à prioriser aujourd’hui.' })
    return
  }

  const userContent =
    'Voici les projets en cours et leurs tâches ouvertes (JSON) :\n\n' +
    JSON.stringify(body.projects, null, 2)

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: FOCUS_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    const text = msg.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
    res.status(200).json({ text })
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
