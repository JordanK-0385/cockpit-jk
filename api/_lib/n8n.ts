import type {
  N8nExecutionEvent,
  N8nMonitoringResponse,
  N8nTriggerType,
  N8nWorkflowStatus,
  N8nWorkflowSummary,
} from '../../src/lib/n8n-types.js'

/**
 * Helper serveur du Monitoring n8n.
 *
 * Appelle l'API REST publique de n8n (`/api/v1/*`) côté serveur uniquement,
 * avec la clé `N8N_API_KEY` (header `X-N8N-API-KEY`). La clé ne doit JAMAIS
 * transiter côté client — seul le proxy `/api/n8n/workflows` l'utilise.
 *
 * Toute l'agrégation (fenêtre 24 h, taux de succès, durées, dérivation du
 * client) se fait ici pour renvoyer un contrat normalisé au front.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000
const EXEC_PAGE_SIZE = 250
const MAX_EXEC_PAGES = 3 // borne dure : jamais de stats fausses silencieuses
const RECENT_FEED_SIZE = 20
const MAX_ERROR_DETAILS = 25 // plafond de fetchs de détail pour les snippets d'erreur
const ERROR_SNIPPET_LEN = 180

// ── Mapping client ───────────────────────────────────────────────────────
// n8n n'a pas de champ « client » natif. Stratégie hybride :
//   1. un tag n8n `client:<slug>` sur le workflow (source de vérité préférée),
//   2. à défaut, la table de correspondance ci-dessous (workflowId → client),
//   3. sinon « Non classé ».
// TODO: migrer entièrement vers les tags n8n et retirer WORKFLOW_CLIENT_MAP.
const CLIENT_TAG_PREFIX = 'client:'
const TAG_SLUG_TO_CLIENT: Record<string, string> = {
  'john-dalia': 'John Dalia',
  'srbl-capital': 'SRBL Capital',
  '26-academy': '26 Academy',
  'jk-interne': 'JK interne',
}
const WORKFLOW_CLIENT_MAP: Record<string, string> = {
  // 'AbCdEf123456': 'John Dalia',
}
const UNCLASSIFIED = 'Non classé'

// ── Formes brutes renvoyées par l'API n8n ─────────────────────────────────
interface RawTag {
  id?: string
  name?: string
}
interface RawNode {
  type?: string
}
interface RawWorkflow {
  id: string
  name: string
  active: boolean
  tags?: RawTag[]
  nodes?: RawNode[]
}
interface RawExecution {
  id: string | number
  workflowId: string | number
  finished?: boolean
  status?: string
  startedAt?: string
  stoppedAt?: string
  mode?: string
}
interface RawListResponse<T> {
  data?: T[]
  nextCursor?: string | null
}

export class N8nConfigError extends Error {}
export class N8nUpstreamError extends Error {}

function n8nConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, '')
  const apiKey = process.env.N8N_API_KEY
  if (!baseUrl) throw new N8nConfigError('N8N_BASE_URL non configuré')
  if (!apiKey) throw new N8nConfigError('N8N_API_KEY non configuré')
  return { baseUrl, apiKey }
}

async function n8nFetch<T>(path: string): Promise<T> {
  const { baseUrl, apiKey } = n8nConfig()
  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      headers: { 'X-N8N-API-KEY': apiKey, Accept: 'application/json' },
    })
  } catch (err) {
    throw new N8nUpstreamError(`n8n injoignable: ${String(err)}`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new N8nUpstreamError(`n8n ${res.status}: ${text.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

// ── Dérivations ────────────────────────────────────────────────────────────
function deriveClient(wf: RawWorkflow): string {
  for (const tag of wf.tags ?? []) {
    const name = tag.name?.trim().toLowerCase()
    if (name?.startsWith(CLIENT_TAG_PREFIX)) {
      const slug = name.slice(CLIENT_TAG_PREFIX.length)
      return TAG_SLUG_TO_CLIENT[slug] ?? slugToTitle(slug)
    }
  }
  return WORKFLOW_CLIENT_MAP[String(wf.id)] ?? UNCLASSIFIED
}

function slugToTitle(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Priorité : un vrai trigger (webhook/form/schedule) l'emporte sur le manuel.
function deriveTrigger(nodes: RawNode[] | undefined): N8nTriggerType {
  if (!nodes?.length) return 'unknown'
  let manual = false
  for (const node of nodes) {
    const t = node.type?.toLowerCase() ?? ''
    if (t.includes('webhook')) return 'webhook'
    if (t.includes('formtrigger') || t.includes('.form')) return 'form'
    if (t.includes('scheduletrigger') || t.includes('cron') || t.includes('interval')) return 'schedule'
    if (t.includes('manualtrigger')) manual = true
  }
  return manual ? 'manual' : 'unknown'
}

// Statut brut n8n → statut normalisé d'exécution.
function normalizeExecStatus(exec: RawExecution): 'success' | 'error' | 'running' | 'unknown' {
  const s = exec.status?.toLowerCase()
  if (s) {
    if (s === 'success') return 'success'
    if (s === 'error' || s === 'crashed' || s === 'failed') return 'error'
    if (s === 'running' || s === 'waiting' || s === 'new') return 'running'
    if (s === 'canceled' || s === 'cancelled') return 'unknown'
  }
  // API ancienne sans champ `status` : on ne peut trancher succès/échec de
  // façon fiable sans les données ; en cours si non terminé, sinon inconnu.
  if (exec.finished === false) return 'running'
  return 'unknown'
}

function durationMs(exec: RawExecution): number | null {
  if (!exec.startedAt || !exec.stoppedAt) return null
  const start = Date.parse(exec.startedAt)
  const stop = Date.parse(exec.stoppedAt)
  if (Number.isNaN(start) || Number.isNaN(stop) || stop < start) return null
  return stop - start
}

function truncate(msg: string): string {
  const clean = msg.replace(/\s+/g, ' ').trim()
  return clean.length > ERROR_SNIPPET_LEN ? `${clean.slice(0, ERROR_SNIPPET_LEN - 1)}…` : clean
}

// ── Récupération des données brutes ─────────────────────────────────────────
async function fetchAllWorkflows(): Promise<RawWorkflow[]> {
  const out: RawWorkflow[] = []
  let cursor: string | null | undefined
  let page = 0
  do {
    const qs = new URLSearchParams({ limit: String(EXEC_PAGE_SIZE) })
    if (cursor) qs.set('cursor', cursor)
    const resp = await n8nFetch<RawListResponse<RawWorkflow>>(`/api/v1/workflows?${qs}`)
    out.push(...(resp.data ?? []))
    cursor = resp.nextCursor
    page++
  } while (cursor && page < MAX_EXEC_PAGES)
  return out
}

async function fetchRecentExecutions(): Promise<{ executions: RawExecution[]; truncated: boolean }> {
  const out: RawExecution[] = []
  let cursor: string | null | undefined
  let page = 0
  do {
    const qs = new URLSearchParams({ limit: String(EXEC_PAGE_SIZE), includeData: 'false' })
    if (cursor) qs.set('cursor', cursor)
    const resp = await n8nFetch<RawListResponse<RawExecution>>(`/api/v1/executions?${qs}`)
    out.push(...(resp.data ?? []))
    cursor = resp.nextCursor
    page++
  } while (cursor && page < MAX_EXEC_PAGES)
  // truncated = il restait des pages mais on a atteint la borne dure.
  return { executions: out, truncated: Boolean(cursor) }
}

// Récupère le message d'erreur d'une exécution via includeData=true. Défensif :
// la structure varie selon les versions n8n. Renvoie null si introuvable.
async function fetchExecutionError(id: string): Promise<string | null> {
  try {
    const exec = await n8nFetch<Record<string, unknown>>(
      `/api/v1/executions/${encodeURIComponent(id)}?includeData=true`,
    )
    const data = exec.data as Record<string, unknown> | undefined
    const resultData =
      (data?.resultData as Record<string, unknown> | undefined) ??
      ((data?.data as Record<string, unknown> | undefined)?.resultData as
        | Record<string, unknown>
        | undefined)
    const error = resultData?.error as { message?: string } | undefined
    return error?.message ? truncate(error.message) : null
  } catch {
    return null
  }
}

// ── Agrégation ──────────────────────────────────────────────────────────────
export async function buildMonitoring(nowMs: number): Promise<N8nMonitoringResponse> {
  const [workflows, { executions, truncated }] = await Promise.all([
    fetchAllWorkflows(),
    fetchRecentExecutions(),
  ])

  const windowStart = nowMs - WINDOW_MS
  const wfById = new Map<string, RawWorkflow>()
  for (const wf of workflows) wfById.set(String(wf.id), wf)

  // Exécutions triées par startedAt décroissant (la plus récente d'abord).
  const sorted = [...executions].sort((a, b) => {
    const ta = a.startedAt ? Date.parse(a.startedAt) : 0
    const tb = b.startedAt ? Date.parse(b.startedAt) : 0
    return tb - ta
  })

  // Accumulateur par workflow.
  type Acc = {
    lastExec: RawExecution | null
    lastErrorExec: RawExecution | null
    exec24h: number
    success24h: number
    error24h: number
    durations24h: number[]
  }
  const accByWf = new Map<string, Acc>()
  const ensure = (id: string): Acc => {
    let a = accByWf.get(id)
    if (!a) {
      a = { lastExec: null, lastErrorExec: null, exec24h: 0, success24h: 0, error24h: 0, durations24h: [] }
      accByWf.set(id, a)
    }
    return a
  }

  let globalExec24h = 0
  let globalSuccess24h = 0
  let globalError24h = 0
  const globalDurations24h: number[] = []

  for (const exec of sorted) {
    const wfId = String(exec.workflowId)
    const acc = ensure(wfId)
    const status = normalizeExecStatus(exec)
    if (!acc.lastExec) acc.lastExec = exec
    if (status === 'error' && !acc.lastErrorExec) acc.lastErrorExec = exec

    const startedMs = exec.startedAt ? Date.parse(exec.startedAt) : NaN
    if (!Number.isNaN(startedMs) && startedMs >= windowStart) {
      acc.exec24h++
      globalExec24h++
      if (status === 'success') {
        acc.success24h++
        globalSuccess24h++
      } else if (status === 'error') {
        acc.error24h++
        globalError24h++
      }
      const d = durationMs(exec)
      if (d !== null) {
        acc.durations24h.push(d)
        globalDurations24h.push(d)
      }
    }
  }

  // Collecte bornée des exécutions en échec dont on veut le message :
  // le dernier échec de chaque workflow + les échecs du flux récent.
  const errorIdsNeeded = new Set<string>()
  for (const acc of accByWf.values()) {
    if (acc.lastErrorExec) errorIdsNeeded.add(String(acc.lastErrorExec.id))
  }
  for (const exec of sorted.slice(0, RECENT_FEED_SIZE)) {
    if (normalizeExecStatus(exec) === 'error') errorIdsNeeded.add(String(exec.id))
  }
  const cappedIds = [...errorIdsNeeded].slice(0, MAX_ERROR_DETAILS)
  const errorMessages = new Map<string, string | null>()
  await Promise.all(
    cappedIds.map(async (id) => {
      errorMessages.set(id, await fetchExecutionError(id))
    }),
  )

  // Workflows normalisés.
  const workflowSummaries: N8nWorkflowSummary[] = workflows.map((wf) => {
    const id = String(wf.id)
    const acc = accByWf.get(id)
    const client = deriveClient(wf)
    const completed24h = (acc?.success24h ?? 0) + (acc?.error24h ?? 0)
    const successRate24h = completed24h > 0 ? (acc?.success24h ?? 0) / completed24h : 1
    const durations = acc?.durations24h ?? []
    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
        : null

    let status: N8nWorkflowStatus
    if (!wf.active) {
      status = 'paused'
    } else if (acc?.lastExec) {
      const s = normalizeExecStatus(acc.lastExec)
      status = s === 'unknown' ? 'unknown' : s
    } else {
      status = 'unknown'
    }

    const lastErrorId = acc?.lastErrorExec ? String(acc.lastErrorExec.id) : null
    const lastError = lastErrorId ? errorMessages.get(lastErrorId) ?? null : null

    return {
      id,
      name: wf.name,
      active: wf.active,
      status,
      triggerType: deriveTrigger(wf.nodes),
      lastRunAt: acc?.lastExec?.startedAt ?? null,
      lastError,
      exec24h: acc?.exec24h ?? 0,
      successRate24h,
      avgDurationMs,
      client,
    }
  })

  // Flux des 20 dernières exécutions.
  const recentExecutions: N8nExecutionEvent[] = sorted
    .slice(0, RECENT_FEED_SIZE)
    .map((exec) => {
      const wfId = String(exec.workflowId)
      const wf = wfById.get(wfId)
      const norm = normalizeExecStatus(exec)
      const feedStatus: 'success' | 'error' | 'running' = norm === 'unknown' ? 'running' : norm
      const errorSnippet =
        feedStatus === 'error' ? errorMessages.get(String(exec.id)) ?? null : null
      return {
        id: String(exec.id),
        workflowId: wfId,
        workflowName: wf?.name ?? 'Workflow inconnu',
        client: wf ? deriveClient(wf) : UNCLASSIFIED,
        status: feedStatus,
        startedAt: exec.startedAt ?? '',
        durationMs: durationMs(exec),
        errorSnippet,
      }
    })

  const globalCompleted24h = globalSuccess24h + globalError24h
  const kpis = {
    activeCount: workflows.filter((w) => w.active).length,
    totalCount: workflows.length,
    exec24h: globalExec24h,
    successRate24h: globalCompleted24h > 0 ? globalSuccess24h / globalCompleted24h : 1,
    failuresToHandle: workflowSummaries.filter((w) => w.status === 'error').length,
    avgDurationMs:
      globalDurations24h.length > 0
        ? Math.round(globalDurations24h.reduce((s, d) => s + d, 0) / globalDurations24h.length)
        : 0,
  }

  return {
    workflows: workflowSummaries,
    recentExecutions,
    kpis,
    truncated,
    fetchedAt: new Date(nowMs).toISOString(),
  }
}
