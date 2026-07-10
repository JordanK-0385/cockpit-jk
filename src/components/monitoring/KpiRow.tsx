import { Activity, CheckCircle2, ListChecks, AlertTriangle, Timer } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { formatDuration, formatPct } from './format'
import type { N8nMonitoringKpis } from '@/lib/n8n-types'

type Tile = {
  label: string
  value: string
  icon: typeof Activity
  tone: 'sage' | 'glacier' | 'terracotta' | 'neutral'
  accent?: boolean
}

export function KpiRow({ kpis }: { kpis: N8nMonitoringKpis }) {
  const tiles: Tile[] = [
    {
      label: 'Workflows actifs',
      value: `${kpis.activeCount} / ${kpis.totalCount}`,
      icon: ListChecks,
      tone: 'sage',
    },
    {
      label: 'Exécutions 24 h',
      value: String(kpis.exec24h),
      icon: Activity,
      tone: 'glacier',
    },
    {
      label: 'Taux de succès 24 h',
      value: formatPct(kpis.successRate24h),
      icon: CheckCircle2,
      tone: kpis.successRate24h >= 0.95 ? 'sage' : 'terracotta',
    },
    {
      label: 'Échecs à traiter',
      value: String(kpis.failuresToHandle),
      icon: AlertTriangle,
      tone: 'terracotta',
      accent: kpis.failuresToHandle > 0,
    },
    {
      label: 'Durée moy. / exéc',
      value: formatDuration(kpis.avgDurationMs || null),
      icon: Timer,
      tone: 'neutral',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {tiles.map((t) => (
        <GlassCard
          key={t.label}
          depth="flat"
          surface="flat"
          tone={t.accent ? 'terracotta' : 'neutral'}
          hoverable={false}
          className={cn('p-4', t.accent && 'ring-1 ring-terracotta/40')}
        >
          <div className="flex items-center gap-2 mb-2">
            <t.icon
              className={cn(
                'h-3.5 w-3.5',
                t.tone === 'sage' && 'text-sage',
                t.tone === 'glacier' && 'text-glacier',
                t.tone === 'terracotta' && 'text-terracotta',
                t.tone === 'neutral' && 'text-muted',
              )}
            />
            <span className="eyebrow truncate">{t.label}</span>
          </div>
          <p
            className={cn(
              'text-2xl font-semibold tabular-nums leading-none',
              t.accent ? 'text-terracotta-light' : 'text-cream-50',
            )}
          >
            {t.value}
          </p>
        </GlassCard>
      ))}
    </div>
  )
}
