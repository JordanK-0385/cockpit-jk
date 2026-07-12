/**
 * Contrat de données partagé entre le proxy serveur (`api/_lib/n8n.ts`) et
 * le client (`src/lib/n8n.ts`). Fichier 100 % types — aucun import runtime,
 * donc importable des deux côtés (`import type`) sans jamais tirer de code
 * client dans le bundle serverless ni l'inverse.
 */

export type N8nWorkflowStatus = 'success' | 'error' | 'running' | 'paused' | 'unknown'

export type N8nTriggerType = 'webhook' | 'schedule' | 'manual' | 'form' | 'unknown'

/** Avertissement d'expiration de credential rattaché à un workflow (lot D). */
export interface N8nCredentialWarning {
  label: string
  date: string // ISO 'YYYY-MM-DD'
  daysLeft: number
}

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

  // ── Lot A : vues-filtres ────────────────────────────────────────────────
  updatedAt: string | null // date de dernière modif du workflow (GET /workflows)
  execThisWeek: number // exéc depuis lundi
  execThisMonth: number // exéc depuis le 1er du mois
  notImproved: boolean // updatedAt > NOT_IMPROVED_DAYS

  // ── Lot B : tokens + coût (null = non calculable, jamais inventé) ────────
  tokensIn: number | null
  tokensOut: number | null
  cost30d: number | null // dans la devise `currency` de la réponse
  model: string | null
  costAvailable: boolean // true si n8n a sauvegardé des données d'exécution

  // ── Lot C : échec silencieux (null = pas de données → n/a) ──────────────
  silent: boolean | null // run succès dont le node de sortie a produit 0 item

  // ── Lot D : credentials qui expirent ────────────────────────────────────
  expiringCredentials: N8nCredentialWarning[]
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

export interface N8nClientCost {
  client: string
  cost30d: number
  tokensIn: number
  tokensOut: number
}

/** Credential proche de l'expiration, vue globale (lot D). */
export interface N8nCredentialExpiry {
  label: string
  date: string // ISO 'YYYY-MM-DD'
  daysLeft: number
  workflows: string[] // libellés des workflows concernés
}

export interface N8nMonitoringKpis {
  activeCount: number
  totalCount: number
  exec24h: number
  successRate24h: number
  failuresToHandle: number
  avgDurationMs: number
  cost30dTotal: number // lot B
}

export interface N8nMonitoringResponse {
  workflows: N8nWorkflowSummary[]
  recentExecutions: N8nExecutionEvent[] // 20 dernières, triées desc
  kpis: N8nMonitoringKpis
  clientCostRollup: N8nClientCost[] // lot B
  credentialsExpiring: N8nCredentialExpiry[] // lot D
  currency: string // devise des montants de coût (ex. 'USD')
  truncated: boolean // pagination executions bornée
  costTruncated: boolean // récupération includeData bornée (lot B/C)
  fetchedAt: string
  reviewCache?: N8nReviewCache | null // conseils IA en cache (lots E & F), null si jamais généré
}

// ════════════════════════════════════════════════════════════════════════
// Lots E & F : conseils IA (batch + cache Firestore, lus côté client)
// ════════════════════════════════════════════════════════════════════════

export interface N8nImprovement {
  title: string
  detail: string
}

/** Résultat d'analyse d'un workflow (lot E), mis en cache. */
export interface N8nWorkflowReview {
  workflowId: string
  workflowName: string
  improvements: N8nImprovement[]
  generatedAt: string
}

export interface N8nClientOpportunity {
  title: string
  pitch: string
}

/** Opportunités par client (lot F), mises en cache. */
export interface N8nClientOpportunities {
  client: string
  opportunities: N8nClientOpportunity[]
  generatedAt: string
}

/** Payload complet écrit en cache par POST /api/n8n/review. */
export interface N8nReviewCache {
  reviews: N8nWorkflowReview[]
  opportunities: N8nClientOpportunities[]
  generatedAt: string
}
