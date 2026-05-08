import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth'

/**
 * Sprint 1 stub. Sprint 2 will replace this with a streaming SSE proxy
 * to the Anthropic Messages API.
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

  res.status(503).json({
    error: 'NOT_WIRED_YET',
    message: 'Le proxy Claude sera branché en Sprint 2.',
    sprint: 2,
  })
}
