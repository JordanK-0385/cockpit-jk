import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth.js'
import { MODEL } from '../_lib/anthropic.js'
import { buildMonitoring, fetchWorkflowStructures, N8nConfigError, N8nUpstreamError } from '../_lib/n8n.js'
import { airtableList, PROJECTS_TABLE } from '../_lib/airtable.js'
import { writeReviewCache } from '../_lib/ai-cache.js'
import { AI_MAX_CLIENTS, AI_MAX_TOKENS, AI_MAX_WORKFLOWS } from '../_lib/n8n-config.js'
import type {
  N8nClientOpportunities,
  N8nReviewCache,
  N8nWorkflowReview,
} from '../../src/lib/n8n-types.js'

/**
 * POST /api/n8n/review — analyses IA du parc n8n (lots E & F). READ-ONLY.
 *
 * BATCH + CACHE : déclenché à la demande (bouton « Analyser mon parc »), JAMAIS
 * au montage de page. Au plus 2 appels Anthropic (E = améliorations par
 * workflow, F = opportunités par client) — garde-fou anti-Denial-of-Wallet.
 * Le résultat est écrit en cache Firestore (server-side) et relu ensuite
 * gratuitement via GET /api/n8n/workflows.
 */

function parseJson<T>(text: string): T | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0]) as T
      } catch {
        return null
      }
    }
    return null
  }
}

async function askJson<T>(
  client: Anthropic,
  system: string,
  user: string,
): Promise<T | null> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: AI_MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return parseJson<T>(text)
}

type ProjectFields = {
  'Nom du projet'?: string
  Client?: string
  Description?: string
  'Notes management'?: string
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

  try {
    // Données parc : structures (nodes) + stats/coût (agrégat monitoring).
    const [structures, monitoring] = await Promise.all([
      fetchWorkflowStructures(),
      buildMonitoring(Date.now()),
    ])
    const statById = new Map(monitoring.workflows.map((w) => [w.id, w]))

    // Contexte Airtable par client (best-effort : ne bloque pas si indispo).
    let projects: { fields: ProjectFields }[] = []
    try {
      const resp = await airtableList<ProjectFields>(
        PROJECTS_TABLE,
        { fields: ['Nom du projet', 'Client', 'Description', 'Notes management'], maxRecords: 100 },
        { scope: 'read' },
      )
      projects = resp.records
    } catch {
      projects = []
    }

    // Payload compact workflows (borné).
    const wfInput = structures.slice(0, AI_MAX_WORKFLOWS).map((s) => {
      const st = statById.get(s.id)
      return {
        id: s.id,
        name: s.name,
        client: s.client,
        trigger: s.triggerType,
        active: s.active,
        nodes: [...new Set(s.nodeTypes.map((t) => t.split('.').pop() ?? t))],
        exec24h: st?.exec24h ?? 0,
        successRate: st ? Math.round(st.successRate24h * 100) : null,
        avgDurationMs: st?.avgDurationMs ?? null,
        cost30d: st?.cost30d ?? null,
        silent: st?.silent ?? null,
        lastError: st?.lastError ?? null,
      }
    })

    const client = new Anthropic({ apiKey })

    // ── E : améliorations par workflow ──────────────────────────────────────
    const reviewSystem =
      "Tu es expert n8n et automatisation. Pour CHAQUE workflow fourni, propose 0 à 2 améliorations CONCRÈTES et actionnables : garde-fou manquant (pas de node IF/gestion d'erreur), anti-doublon absent, trigger manuel automatisable (schedule/webhook), lenteur (durée élevée), valeur en dur à externaliser. Sois spécifique au workflow, bref, en français. Aucune amélioration évidente = tableau vide. " +
      'Réponds UNIQUEMENT en JSON valide, sans texte autour : {"reviews":[{"workflowId":"...","improvements":[{"title":"...","detail":"..."}]}]}'
    const reviewRaw = await askJson<{
      reviews?: { workflowId?: string; improvements?: { title?: string; detail?: string }[] }[]
    }>(client, reviewSystem, JSON.stringify({ workflows: wfInput }))

    const reviews: N8nWorkflowReview[] = []
    for (const r of reviewRaw?.reviews ?? []) {
      const wf = structures.find((s) => s.id === r.workflowId)
      if (!wf) continue
      const improvements = (r.improvements ?? [])
        .filter((i) => i.title)
        .slice(0, 2)
        .map((i) => ({ title: String(i.title), detail: String(i.detail ?? '') }))
      if (improvements.length > 0) {
        reviews.push({ workflowId: wf.id, workflowName: wf.name, improvements, generatedAt: new Date().toISOString() })
      }
    }

    // ── F : opportunités par client ─────────────────────────────────────────
    const byClient = new Map<string, { workflows: string[]; context: string[] }>()
    for (const s of structures) {
      const e = byClient.get(s.client) ?? { workflows: [], context: [] }
      e.workflows.push(s.name)
      byClient.set(s.client, e)
    }
    for (const p of projects) {
      const c = (p.fields.Client ?? '').trim()
      if (!c) continue
      const e = byClient.get(c) ?? { workflows: [], context: [] }
      const parts = [p.fields['Nom du projet'], p.fields.Description, p.fields['Notes management']]
        .filter(Boolean)
        .join(' — ')
      if (parts) e.context.push(parts)
      byClient.set(c, e)
    }
    const clientInput = [...byClient.entries()]
      .slice(0, AI_MAX_CLIENTS)
      .map(([clientName, e]) => ({ client: clientName, workflows: e.workflows, context: e.context.slice(0, 8) }))

    const oppSystem =
      "Tu es consultant en automatisation IA. Pour CHAQUE client, propose 1 à 3 NOUVELLES automatisations à lui vendre, en t'appuyant sur ses workflows n8n existants et son contexte projet. Chaque proposition : un titre court + un pitch argumenté (valeur métier, 1-2 phrases), en français, concret et vendable. " +
      'Réponds UNIQUEMENT en JSON valide, sans texte autour : {"opportunities":[{"client":"...","opportunities":[{"title":"...","pitch":"..."}]}]}'
    const oppRaw = await askJson<{
      opportunities?: { client?: string; opportunities?: { title?: string; pitch?: string }[] }[]
    }>(client, oppSystem, JSON.stringify({ clients: clientInput }))

    const opportunities: N8nClientOpportunities[] = []
    for (const o of oppRaw?.opportunities ?? []) {
      if (!o.client) continue
      const items = (o.opportunities ?? [])
        .filter((i) => i.title)
        .slice(0, 3)
        .map((i) => ({ title: String(i.title), pitch: String(i.pitch ?? '') }))
      if (items.length > 0) {
        opportunities.push({ client: String(o.client), opportunities: items, generatedAt: new Date().toISOString() })
      }
    }

    const cache: N8nReviewCache = {
      reviews,
      opportunities,
      generatedAt: new Date().toISOString(),
    }
    await writeReviewCache(auth.uid, cache)
    res.status(200).json(cache)
  } catch (err) {
    if (err instanceof N8nConfigError || err instanceof N8nUpstreamError) {
      res.status(502).json({ error: 'N8N_UPSTREAM_ERROR', detail: err.message })
      return
    }
    const message =
      err instanceof Anthropic.APIError
        ? `${err.status ?? 'API'}: ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err)
    res.status(500).json({ error: 'REVIEW_FAILED', detail: message })
  }
}
