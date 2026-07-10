import { AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import type { N8nWorkflowSummary } from '@/lib/n8n-types'

/**
 * Bandeau terracotta affiché dès qu'au moins un workflow est en échec.
 * Liste courte des workflows concernés (verdict d'ouverture : « qqch a lâché »).
 */
export function AlertBanner({ failing }: { failing: N8nWorkflowSummary[] }) {
  if (failing.length === 0) return null
  return (
    <GlassCard depth="l3" tone="terracotta" className="p-4" hoverable={false}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-terracotta shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-terracotta-light">
            {failing.length} workflow{failing.length > 1 ? 's' : ''} en échec
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {failing.slice(0, 8).map((w) => (
              <GlassBadge key={w.id} tone="terracotta" className="max-w-[220px] truncate">
                {w.name}
              </GlassBadge>
            ))}
            {failing.length > 8 && (
              <span className="text-xs text-muted self-center">+{failing.length - 8}</span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
