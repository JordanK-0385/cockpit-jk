import { useMemo } from 'react'
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { Skeleton } from '@/components/ui/Loader'
import { KpiRow } from '@/components/monitoring/KpiRow'
import { AlertBanner } from '@/components/monitoring/AlertBanner'
import { WorkflowCard } from '@/components/monitoring/WorkflowCard'
import { ExecutionFeed } from '@/components/monitoring/ExecutionFeed'
import { useN8nMonitoring } from '@/lib/n8n'
import type { N8nWorkflowSummary } from '@/lib/n8n-types'

// Ordre d'affichage des sections client (les clients connus d'abord).
const CLIENT_ORDER = ['John Dalia', 'SRBL Capital', '26 Academy', 'JK interne']

function groupByClient(workflows: N8nWorkflowSummary[]): [string, N8nWorkflowSummary[]][] {
  const byClient = new Map<string, N8nWorkflowSummary[]>()
  for (const w of workflows) {
    const arr = byClient.get(w.client) ?? []
    arr.push(w)
    byClient.set(w.client, arr)
  }
  const clients = [...byClient.keys()].sort((a, b) => {
    const ia = CLIENT_ORDER.indexOf(a)
    const ib = CLIENT_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
  return clients.map((c) => [c, byClient.get(c)!])
}

function ClientSection({ client, workflows }: { client: string; workflows: N8nWorkflowSummary[] }) {
  const failures = workflows.filter((w) => w.status === 'error').length
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cream-50">{client}</h3>
          <span className="text-eyebrow text-muted-deeper">
            {workflows.length} workflow{workflows.length > 1 ? 's' : ''}
          </span>
        </div>
        {failures > 0 ? (
          <GlassBadge tone="terracotta" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {failures} échec{failures > 1 ? 's' : ''}
          </GlassBadge>
        ) : (
          <GlassBadge tone="sage" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            OK
          </GlassBadge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {workflows.map((w) => (
          <WorkflowCard key={w.id} workflow={w} />
        ))}
      </div>
    </section>
  )
}

export function MonitoringN8n() {
  const { data, isLoading, error } = useN8nMonitoring()

  const grouped = useMemo(() => (data ? groupByClient(data.workflows) : []), [data])
  const failing = useMemo(
    () => (data ? data.workflows.filter((w) => w.status === 'error') : []),
    [data],
  )
  const activeCount = data?.kpis.activeCount ?? 0

  return (
    <AppShell>
      <div className="col-scroll px-6 py-6 max-w-[1400px] mx-auto w-full">
        {/* Barre de titre */}
        <div className="flex items-center gap-2.5 mb-5">
          <span className="text-sage">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-cream-50 leading-tight">Monitoring n8n</h2>
            <span className="eyebrow">
              Workflows · {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Chargement */}
        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          </div>
        )}

        {/* Erreur (n8n injoignable / non configuré) — l'onglet ne plante pas */}
        {!isLoading && error && (
          <GlassCard depth="l3" tone="terracotta" className="p-5" hoverable={false}>
            <div className="flex items-start gap-2 text-sm text-terracotta-light">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Impossible de joindre l'API n8n.</p>
                <p className="text-xs text-muted mt-1 break-words">{error.message}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Vide */}
        {!isLoading && !error && data && data.workflows.length === 0 && (
          <GlassCard depth="l3" tone="neutral" className="p-8 text-center" hoverable={false}>
            <div className="flex flex-col items-center gap-2">
              <Activity className="h-8 w-8 text-muted-deeper" />
              <p className="text-sm text-muted">Aucun workflow trouvé sur l'instance n8n.</p>
            </div>
          </GlassCard>
        )}

        {/* Contenu */}
        {!isLoading && !error && data && data.workflows.length > 0 && (
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
            {/* Colonne principale */}
            <div className="space-y-6 min-w-0">
              <KpiRow kpis={data.kpis} />
              <AlertBanner failing={failing} />
              {data.truncated && (
                <p className="text-eyebrow text-muted-deeper px-1">
                  Données partielles : la pagination des exécutions a été bornée.
                </p>
              )}
              <div className="space-y-6">
                {grouped.map(([client, workflows]) => (
                  <ClientSection key={client} client={client} workflows={workflows} />
                ))}
              </div>
            </div>

            {/* Flux d'exécutions (sticky) */}
            <div className="mt-6 lg:mt-0">
              <ExecutionFeed executions={data.recentExecutions} />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
