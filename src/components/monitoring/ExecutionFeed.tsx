import { Radio } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import type { N8nExecutionEvent } from '@/lib/n8n-types'
import { formatDuration, formatRelative } from './format'

const dotByStatus: Record<N8nExecutionEvent['status'], string> = {
  success: 'bg-sage',
  error: 'bg-terracotta',
  running: 'bg-glacier',
}

/**
 * Colonne sticky : flux temps réel des 20 dernières exécutions, avec snippet
 * d'erreur inline sur les échecs.
 */
export function ExecutionFeed({ executions }: { executions: N8nExecutionEvent[] }) {
  return (
    <GlassCard depth="l2" tone="neutral" hoverable={false} className="p-4 lg:sticky lg:top-24">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="h-3.5 w-3.5 text-sage" />
        <span className="eyebrow">Flux d'exécutions · {executions.length}</span>
      </div>

      {executions.length === 0 ? (
        <p className="text-xs text-muted-deeper py-4 text-center">Aucune exécution récente.</p>
      ) : (
        <ol className="relative space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {executions.map((e) => (
            <li key={e.id} className="flex gap-2.5">
              <span
                className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', dotByStatus[e.status])}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium text-cream-50 truncate">{e.workflowName}</p>
                  <span className="text-eyebrow text-muted-deeper shrink-0">
                    {formatRelative(e.startedAt)}
                  </span>
                </div>
                <p className="text-eyebrow text-muted-deeper">
                  {e.client} · {formatDuration(e.durationMs)}
                </p>
                {e.status === 'error' && e.errorSnippet && (
                  <p className="mt-1 text-[11px] text-terracotta-light leading-snug break-words">
                    {e.errorSnippet}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  )
}
