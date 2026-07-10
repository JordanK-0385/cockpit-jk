/**
 * Contrat de données partagé entre le proxy serveur (`api/_lib/n8n.ts`) et
 * le client (`src/lib/n8n.ts`). Fichier 100 % types — aucun import runtime,
 * donc importable des deux côtés (`import type`) sans jamais tirer de code
 * client dans le bundle serverless ni l'inverse.
 */

export type N8nWorkflowStatus = 'success' | 'error' | 'running' | 'paused' | 'unknown'

export type N8nTriggerType = 'webhook' | 'schedule' | 'manual' | 'form' | 'unknown'

export interface N8nWorkflowSummary {
  id: string
  name: string
  active: boolean
  status: N8nWorkflowStatus
  triggerType: N8nTriggerType
  lastRunAt: string | null // ISO
  lastError: string | null // message brut de la dernière exéc en échec, tronqué ~180c
  exec24h: number
  successRate24h: number // 0..1
  avgDurationMs: number | null
  client: string // dérivé (tag n8n `client:*` puis table de mapping)
}

export interface N8nExecutionEvent {
  id: string
  workflowId: string
  workflowName: string
  client: string
  status: 'success' | 'error' | 'running'
  startedAt: string
  durationMs: number | null
  errorSnippet: string | null
}

export interface N8nMonitoringKpis {
  activeCount: number
  totalCount: number
  exec24h: number
  successRate24h: number
  failuresToHandle: number
  avgDurationMs: number
}

export interface N8nMonitoringResponse {
  workflows: N8nWorkflowSummary[]
  recentExecutions: N8nExecutionEvent[] // 20 dernières, triées desc
  kpis: N8nMonitoringKpis
  truncated: boolean // true si la pagination executions a été bornée
  fetchedAt: string
}
