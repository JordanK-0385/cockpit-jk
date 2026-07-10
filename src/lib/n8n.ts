import { useQuery } from '@tanstack/react-query'
import { authedFetch } from './airtable'
import type { N8nMonitoringResponse } from './n8n-types'

export type {
  N8nMonitoringResponse,
  N8nWorkflowSummary,
  N8nExecutionEvent,
  N8nWorkflowStatus,
  N8nTriggerType,
} from './n8n-types'

const REFETCH_MS = 30_000 // effet « live » : re-fetch toutes les 30 s
const STALE_MS = 15_000

/**
 * URL de l'éditeur n8n exposée au client pour construire les liens
 * « Ouvrir dans n8n ». Non sensible (la clé API, elle, reste serveur).
 */
export const N8N_BASE_URL = (import.meta.env.VITE_N8N_BASE_URL ?? '').replace(/\/+$/, '')

export function workflowEditorUrl(id: string): string | null {
  return N8N_BASE_URL ? `${N8N_BASE_URL}/workflow/${encodeURIComponent(id)}` : null
}

/** Ton Alpine Studio associé à chaque client (bordure/badge de carte). */
export function clientTone(client: string): 'sage' | 'glacier' | 'terracotta' | 'neutral' {
  switch (client) {
    case 'John Dalia':
      return 'terracotta'
    case 'SRBL Capital':
      return 'glacier'
    case '26 Academy':
      return 'sage'
    default:
      return 'neutral'
  }
}

async function fetchMonitoring(): Promise<N8nMonitoringResponse> {
  const r = await authedFetch('/api/n8n/workflows')
  if (!r.ok) {
    let detail = ''
    try {
      const body = (await r.json()) as { error?: string; detail?: string }
      detail = body.detail ?? body.error ?? ''
    } catch {
      detail = await r.text().catch(() => '')
    }
    throw new Error(detail || `n8n monitoring failed (${r.status})`)
  }
  return (await r.json()) as N8nMonitoringResponse
}

/**
 * Hook Monitoring n8n — calqué sur `useRadar`. Re-fetch périodique pour un
 * effet temps réel. Renvoie l'agrégat déjà normalisé par le proxy.
 */
export function useN8nMonitoring() {
  const query = useQuery<N8nMonitoringResponse, Error>({
    queryKey: ['n8n', 'monitoring'],
    queryFn: fetchMonitoring,
    refetchInterval: REFETCH_MS,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
  }
}
