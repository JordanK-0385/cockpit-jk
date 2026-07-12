import type { N8nWorkflowSummary } from '@/lib/n8n-types'

export type FilterKey =
  | 'all'
  | 'active-week'
  | 'inactive-month'
  | 'success'
  | 'error'
  | 'not-improved'
  | 'silent'
  | 'credential'

type FilterDef = {
  key: FilterKey
  label: string
  /** true si le workflow entre dans ce filtre. */
  match: (w: N8nWorkflowSummary) => boolean
}

export const FILTERS: FilterDef[] = [
  { key: 'all', label: 'Toutes', match: () => true },
  { key: 'active-week', label: 'Active (semaine)', match: (w) => w.execThisWeek >= 1 },
  { key: 'inactive-month', label: 'Inactive (mois)', match: (w) => w.execThisMonth === 0 },
  { key: 'success', label: 'En succès', match: (w) => w.status === 'success' },
  { key: 'error', label: 'En échec', match: (w) => w.status === 'error' },
  { key: 'not-improved', label: 'Pas amélioré', match: (w) => w.notImproved },
  { key: 'silent', label: 'Silencieux', match: (w) => w.silent === true },
  { key: 'credential', label: 'Token qui expire', match: (w) => w.expiringCredentials.length > 0 },
]

export function filterWorkflows(workflows: N8nWorkflowSummary[], key: FilterKey): N8nWorkflowSummary[] {
  const def = FILTERS.find((f) => f.key === key) ?? FILTERS[0]
  return workflows.filter(def.match)
}

export function filterCounts(workflows: N8nWorkflowSummary[]): Record<FilterKey, number> {
  const out = {} as Record<FilterKey, number>
  for (const f of FILTERS) out[f.key] = workflows.filter(f.match).length
  return out
}
