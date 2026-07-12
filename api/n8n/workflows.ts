import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth.js'
import { buildMonitoring, N8nConfigError, N8nUpstreamError } from '../_lib/n8n.js'
import { readReviewCache } from '../_lib/ai-cache.js'

/**
 * Proxy Monitoring n8n — Sprint 5, READ-ONLY strict.
 *
 *   GET /api/n8n/workflows → agrégat normalisé (KPI, workflows par client,
 *                            flux d'exécutions). Voir `api/_lib/n8n.ts`.
 *
 * Aucune mutation depuis le Cockpit ce sprint (pas de POST/PATCH/DELETE/run) :
 * on ne câble aucune écriture n8n avant d'avoir posé le pattern fail-closed.
 * Toute autre méthode → 501 (prévu Sprint 6).
 *
 * Gating identique aux autres routes : Firebase ID token vérifié + email ==
 * AUTHORIZED_EMAIL. La clé N8N_API_KEY reste strictement côté serveur.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStore(res)
  const auth = await requireAuthorizedUser(req, res)
  if (!auth) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(501).json({ error: 'NOT_IMPLEMENTED', sprint: 6 })
    return
  }

  try {
    const [data, reviewCache] = await Promise.all([
      buildMonitoring(Date.now()),
      readReviewCache(auth.uid),
    ])
    res.status(200).json({ ...data, reviewCache })
  } catch (err) {
    if (err instanceof N8nConfigError) {
      res.status(502).json({ error: 'N8N_NOT_CONFIGURED', detail: err.message })
      return
    }
    if (err instanceof N8nUpstreamError) {
      res.status(502).json({ error: 'N8N_UPSTREAM_ERROR', detail: err.message })
      return
    }
    res.status(502).json({ error: 'N8N_UNKNOWN_ERROR', detail: String(err) })
  }
}
