import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth'

/**
 * Sprint 1 stub. Sprint 5 will proxy n8n REST API:
 *   - GET    /api/n8n/workflows                → list
 *   - POST   /api/n8n/workflows  { ...wf }     → create
 *   - PATCH  /api/n8n/workflows?id=<id>        → update / activate
 *   - DELETE /api/n8n/workflows?id=<id>        → delete
 *   - POST   /api/n8n/workflows?id=<id>&run=1  → run / execute
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStore(res)
  const auth = await requireAuthorizedUser(req, res)
  if (!auth) return

  res.status(503).json({
    error: 'NOT_WIRED_YET',
    message: 'Le proxy n8n sera branché en Sprint 5.',
    sprint: 5,
  })
}
