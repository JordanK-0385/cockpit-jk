import type {
  N8nClientCost,
  N8nCredentialExpiry,
  N8nCredentialWarning,
  N8nExecutionEvent,
  N8nMonitoringResponse,
  N8nTriggerType,
  N8nWorkflowStatus,
  N8nWorkflowSummary,
} from '../../src/lib/n8n-types.js'
import {
  COST_WINDOW_DAYS,
  CREDENTIAL_WARN_DAYS,
  CREDENTIALS_EXPIRY,
  CURRENCY,
  DATA_FETCH_CAP,
  DATA_FETCH_CONCURRENCY,
  EUR_USD_RATE,
  NOT_IMPROVED_DAYS,
  SILENT_OUTPUT_NODE,
  priceForModel,
} from './n8n-config.js'

/**
 * Helper serveur du Monitoring n8n.
 *
 * Appelle l'API REST publique de n8n (`/api/v1/*`) côté serveur uniquement,
 * avec la clé `N8N_API_KEY` (header `X-N8N-API-KEY`). La clé ne doit JAMAIS
 * transiter côté client — seul le proxy `/api/n8n/workflows` l'utilise.
 *
 * Toute l'agrégation se fait ici (fenêtre 24 h & 30 j, taux de succès, durées,
 * flags de vues, tokens/coût, échec silencieux, credentials) pour renvoyer un
 * contrat normalisé. Read-only strict : aucune mutation n8n.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000
const WINDOW_MS = MS_PER_DAY // 24 h
const EXEC_PAGE_SIZE = 250
const MAX_EXEC_PAGES = 3 // borne dure : jamais de stats fausses silencieuses
const RECENT_FEED_SIZE = 20
const MAX_ERROR_DETAILS = 25 // plafond de fetchs de détail pour les snippets d'erreur
const ERROR_SNIPPET_LEN = 180
const COST_WINDOW_MS = COST_WINDOW_DAYS * MS_PER_DAY

// ── Mapping client ───────────────────────────────────────────────────────
const CLIENT_TAG_PREFIX = 'client:'
const TAG_SLUG_TO_CLIENT: Record<string, string> = {
  'john-dalia': 'John Dalia',
  'srbl-capital': 'SRBL Capital',
  '26-academy': '26 Academy',
  'jk-interne': 'JK Consulting',
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
  updatedAt?: string
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
interface RawExecutionDetail extends RawExecution {
  data?: unknown
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

function normalizeExecStatus(exec: RawExecution): 'success' | 'error' | 'running' | 'unknown' {
  const s = exec.status?.toLowerCase()
  if (s) {
    if (s === 'success') return 'success'
    if (s === 'error' || s === 'crashed' || s === 'failed') return 'error'
    if (s === 'running' || s === 'waiting' || s === 'new') return 'running'
    if (s === 'canceled' || s === 'cancelled') return 'unknown'
  }
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

// Début de semaine (lundi 00:00 UTC) et du mois, pour les flags du lot A.
function startOfWeek(nowMs: number): number {
  const d = new Date(nowMs)
  const dayFromMonday = (d.getUTCDay() + 6) % 7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dayFromMonday * MS_PER_DAY
}
function startOfMonth(nowMs: number): number {
  const d = new Date(nowMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
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
  return { executions: out, truncated: Boolean(cursor) }
}

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

async function fetchExecutionDetail(id: string): Promise<RawExecutionDetail | null> {
  try {
    return await n8nFetch<RawExecutionDetail>(
      `/api/v1/executions/${encodeURIComponent(id)}?includeData=true`,
    )
  } catch {
    return null
  }
}

// Exécute `fn` sur `items` avec un parallélisme borné (évite d'inonder n8n).
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i])
    }
  }
  const n = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

// ── Lot B : extraction tokens/model depuis les données d'exécution ──────────
type UsageAcc = { in: number; out: number; model: string | null; found: boolean }

function numFrom(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// Scan récursif défensif : les nodes Anthropic (HTTP Request direct ou
// LangChain) rangent l'`usage` sous des clés variables selon la version.
function scanUsage(val: unknown, acc: UsageAcc): void {
  if (!val || typeof val !== 'object') return
  if (Array.isArray(val)) {
    for (const v of val) scanUsage(v, acc)
    return
  }
  const o = val as Record<string, unknown>
  const inp = numFrom(o.input_tokens ?? o.prompt_tokens ?? o.promptTokens ?? o.inputTokens)
  const out = numFrom(o.output_tokens ?? o.completion_tokens ?? o.completionTokens ?? o.outputTokens)
  if (inp !== null || out !== null) {
    acc.in += inp ?? 0
    acc.out += out ?? 0
    acc.found = true
  }
  if (!acc.model && typeof o.model === 'string') acc.model = o.model
  for (const k of Object.keys(o)) scanUsage(o[k], acc)
}

function getResultData(
  data: unknown,
): { runData?: Record<string, unknown[]>; lastNodeExecuted?: string } | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const rd =
    (d.resultData as Record<string, unknown> | undefined) ??
    ((d.data as Record<string, unknown> | undefined)?.resultData as Record<string, unknown> | undefined)
  if (!rd) return null
  return {
    runData: rd.runData as Record<string, unknown[]> | undefined,
    lastNodeExecuted: rd.lastNodeExecuted as string | undefined,
  }
}

// Nombre d'items produits par le node de sortie (lot C). null = indéterminable.
function outputItemCount(detail: RawExecutionDetail, outputNode: string | undefined): number | null {
  const rd = getResultData(detail.data)
  if (!rd?.runData) return null
  const nodeName = outputNode ?? rd.lastNodeExecuted
  if (!nodeName) return null
  const entries = rd.runData[nodeName]
  if (!Array.isArray(entries) || entries.length === 0) return null
  const last = entries[entries.length - 1] as { data?: { main?: unknown } } | undefined
  const main = last?.data?.main
  if (!Array.isArray(main)) return null
  const branch = main[0]
  return Array.isArray(branch) ? branch.length : 0
}

// ── Agrégation ──────────────────────────────────────────────────────────────
export async function buildMonitoring(nowMs: number): Promise<N8nMonitoringResponse> {
  const [workflows, { executions, truncated }] = await Promise.all([
    fetchAllWorkflows(),
    fetchRecentExecutions(),
  ])

  const windowStart = nowMs - WINDOW_MS
  const weekStart = startOfWeek(nowMs)
  const monthStart = startOfMonth(nowMs)
  const costWindowStart = nowMs - COST_WINDOW_MS

  const wfById = new Map<string, RawWorkflow>()
  for (const wf of workflows) wfById.set(String(wf.id), wf)

  const sorted = [...executions].sort((a, b) => {
    const ta = a.startedAt ? Date.parse(a.startedAt) : 0
    const tb = b.startedAt ? Date.parse(b.startedAt) : 0
    return tb - ta
  })

  type Acc = {
    lastExec: RawExecution | null
    lastErrorExec: RawExecution | null
    exec24h: number
    success24h: number
    error24h: number
    durations24h: number[]
    execThisWeek: number
    execThisMonth: number
  }
  const accByWf = new Map<string, Acc>()
  const ensure = (id: string): Acc => {
    let a = accByWf.get(id)
    if (!a) {
      a = {
        lastExec: null,
        lastErrorExec: null,
        exec24h: 0,
        success24h: 0,
        error24h: 0,
        durations24h: [],
        execThisWeek: 0,
        execThisMonth: 0,
      }
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
    if (!Number.isNaN(startedMs)) {
      if (startedMs >= weekStart) acc.execThisWeek++
      if (startedMs >= monthStart) acc.execThisMonth++
      if (startedMs >= windowStart) {
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
  }

  // ── Snippets d'erreur (inchangé) ──────────────────────────────────────────
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

  // ── Lots B & C : récupération bornée des données d'exécution (30 j) ───────
  const costWindowExecs = sorted.filter((e) => {
    const t = e.startedAt ? Date.parse(e.startedAt) : NaN
    return !Number.isNaN(t) && t >= costWindowStart
  })
  const dataExecs = costWindowExecs.slice(0, DATA_FETCH_CAP)
  const costTruncated = costWindowExecs.length > DATA_FETCH_CAP

  type CostAcc = {
    tokensIn: number
    tokensOut: number
    model: string | null
    hasExecData: boolean
    hasUsage: boolean
    silent: boolean | null // depuis le run succès le plus récent
    silentRunAt: number
  }
  const costByWf = new Map<string, CostAcc>()
  const ensureCost = (id: string): CostAcc => {
    let a = costByWf.get(id)
    if (!a) {
      a = { tokensIn: 0, tokensOut: 0, model: null, hasExecData: false, hasUsage: false, silent: null, silentRunAt: 0 }
      costByWf.set(id, a)
    }
    return a
  }

  const details = await mapWithConcurrency(dataExecs, DATA_FETCH_CONCURRENCY, (e) =>
    fetchExecutionDetail(String(e.id)).then((detail) => ({ exec: e, detail })),
  )

  for (const { exec, detail } of details) {
    if (!detail) continue
    const wfId = String(exec.workflowId)
    const acc = ensureCost(wfId)
    const rd = getResultData(detail.data)
    if (rd?.runData) acc.hasExecData = true

    // Tokens / modèle
    const usage: UsageAcc = { in: 0, out: 0, model: null, found: false }
    if (rd?.runData) scanUsage(rd.runData, usage)
    if (usage.found) {
      acc.tokensIn += usage.in
      acc.tokensOut += usage.out
      acc.hasUsage = true
      if (usage.model && !acc.model) acc.model = usage.model
    }

    // Échec silencieux : run succès le plus récent dont la sortie = 0 item
    if (normalizeExecStatus(exec) === 'success' && rd?.runData) {
      const startedMs = exec.startedAt ? Date.parse(exec.startedAt) : 0
      if (startedMs >= acc.silentRunAt) {
        const count = outputItemCount(detail, SILENT_OUTPUT_NODE[wfId])
        if (count !== null) {
          acc.silent = count === 0
          acc.silentRunAt = startedMs
        }
      }
    }
  }

  // ── Lot D : credentials qui expirent ─────────────────────────────────────
  const credWarningsByWfName = new Map<string, N8nCredentialWarning[]>()
  const credentialsExpiring: N8nCredentialExpiry[] = []
  for (const cfg of CREDENTIALS_EXPIRY) {
    if (!cfg.date) continue // date vide = non renseignée, on n'invente rien
    const dueMs = Date.parse(cfg.date)
    if (Number.isNaN(dueMs)) continue
    const daysLeft = Math.ceil((dueMs - nowMs) / MS_PER_DAY)
    if (daysLeft > CREDENTIAL_WARN_DAYS) continue
    const workflowsConcerned = cfg.workflows ?? []
    credentialsExpiring.push({ label: cfg.label, date: cfg.date, daysLeft, workflows: workflowsConcerned })
    for (const wfName of workflowsConcerned) {
      const arr = credWarningsByWfName.get(wfName) ?? []
      arr.push({ label: cfg.label, date: cfg.date, daysLeft })
      credWarningsByWfName.set(wfName, arr)
    }
  }

  // ── Résumés workflows ─────────────────────────────────────────────────────
  const clientCost = new Map<string, N8nClientCost>()
  let cost30dTotal = 0

  const workflowSummaries: N8nWorkflowSummary[] = workflows.map((wf) => {
    const id = String(wf.id)
    const acc = accByWf.get(id)
    const cost = costByWf.get(id)
    const client = deriveClient(wf)
    const completed24h = (acc?.success24h ?? 0) + (acc?.error24h ?? 0)
    const successRate24h = completed24h > 0 ? (acc?.success24h ?? 0) / completed24h : 1
    const durations = acc?.durations24h ?? []
    const avgDurationMs =
      durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null

    let status: N8nWorkflowStatus
    if (!wf.active) status = 'paused'
    else if (acc?.lastExec) {
      const s = normalizeExecStatus(acc.lastExec)
      status = s === 'unknown' ? 'unknown' : s
    } else status = 'unknown'

    const lastErrorId = acc?.lastErrorExec ? String(acc.lastErrorExec.id) : null
    const lastError = lastErrorId ? errorMessages.get(lastErrorId) ?? null : null

    // Coût
    const price = priceForModel(cost?.model)
    let cost30d: number | null = null
    let tokensIn: number | null = null
    let tokensOut: number | null = null
    if (cost?.hasUsage) {
      tokensIn = cost.tokensIn
      tokensOut = cost.tokensOut
      if (price) {
        const usd = (cost.tokensIn / 1e6) * price.in + (cost.tokensOut / 1e6) * price.out
        const converted = EUR_USD_RATE ? usd * EUR_USD_RATE : usd
        cost30d = Math.round(converted * 100) / 100
      }
    }
    if (cost30d !== null) {
      cost30dTotal += cost30d
      const roll = clientCost.get(client) ?? { client, cost30d: 0, tokensIn: 0, tokensOut: 0 }
      roll.cost30d += cost30d
      roll.tokensIn += tokensIn ?? 0
      roll.tokensOut += tokensOut ?? 0
      clientCost.set(client, roll)
    }

    const updatedAt = wf.updatedAt ?? null
    const notImproved =
      updatedAt !== null && !Number.isNaN(Date.parse(updatedAt))
        ? nowMs - Date.parse(updatedAt) > NOT_IMPROVED_DAYS * MS_PER_DAY
        : false

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
      updatedAt,
      execThisWeek: acc?.execThisWeek ?? 0,
      execThisMonth: acc?.execThisMonth ?? 0,
      notImproved,
      tokensIn,
      tokensOut,
      cost30d,
      model: cost?.model ?? null,
      costAvailable: cost?.hasExecData ?? false,
      silent: cost?.silent ?? null,
      expiringCredentials: credWarningsByWfName.get(wf.name) ?? [],
    }
  })

  // ── Flux des 20 dernières exécutions ─────────────────────────────────────
  const recentExecutions: N8nExecutionEvent[] = sorted.slice(0, RECENT_FEED_SIZE).map((exec) => {
    const wfId = String(exec.workflowId)
    const wf = wfById.get(wfId)
    const norm = normalizeExecStatus(exec)
    const feedStatus: 'success' | 'error' | 'running' = norm === 'unknown' ? 'running' : norm
    const errorSnippet = feedStatus === 'error' ? errorMessages.get(String(exec.id)) ?? null : null
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
    cost30dTotal: Math.round(cost30dTotal * 100) / 100,
  }

  const clientCostRollup = [...clientCost.values()].sort((a, b) => b.cost30d - a.cost30d)

  return {
    workflows: workflowSummaries,
    recentExecutions,
    kpis,
    clientCostRollup,
    credentialsExpiring: credentialsExpiring.sort((a, b) => a.daysLeft - b.daysLeft),
    currency: CURRENCY,
    truncated,
    costTruncated,
    fetchedAt: new Date(nowMs).toISOString(),
  }
}
