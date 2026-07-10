import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Pause,
  RefreshCw,
  ScrollText,
  Webhook,
  Zap,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { cn } from '@/lib/utils'
import { clientTone, workflowEditorUrl } from '@/lib/n8n'
import type { N8nWorkflowSummary } from '@/lib/n8n-types'
import { formatDuration, formatPct, formatRelative } from './format'

const borderByTone: Record<'sage' | 'glacier' | 'terracotta' | 'neutral', string> = {
  sage: 'border-l-2 border-l-sage/60',
  glacier: 'border-l-2 border-l-glacier/60',
  terracotta: 'border-l-2 border-l-terracotta/60',
  neutral: 'border-l-2 border-l-glass-16',
}

type Badge = {
  label: string
  tone: 'sage' | 'glacier' | 'terracotta' | 'neutral'
  icon: typeof Zap
  live?: boolean
}

function stateBadge(w: N8nWorkflowSummary): Badge {
  if (w.status === 'paused') return { label: 'En pause', tone: 'neutral', icon: Pause }
  if (w.status === 'error') return { label: 'Erreur', tone: 'terracotta', icon: AlertTriangle }
  if (w.status === 'running') return { label: 'En cours', tone: 'glacier', icon: RefreshCw, live: true }
  if (w.triggerType === 'schedule') return { label: 'Planifié', tone: 'glacier', icon: Clock }
  if (w.triggerType === 'webhook' || w.triggerType === 'form')
    return { label: 'Actif · live', tone: 'sage', icon: Webhook, live: true }
  return { label: 'Actif', tone: 'sage', icon: Zap }
}

function SuccessBar({ rate }: { rate: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(rate * 100)))
  const good = rate >= 0.95
  return (
    <div className="h-1.5 w-full rounded-full bg-glass-7 overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500',
          good ? 'bg-gradient-to-r from-sage to-sage-deep' : 'bg-gradient-to-r from-terracotta to-terracotta',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-eyebrow text-muted-deeper uppercase tracking-wider truncate">{label}</p>
      <p className="text-sm font-semibold text-cream-50 tabular-nums">{value}</p>
    </div>
  )
}

export function WorkflowCard({ workflow }: { workflow: N8nWorkflowSummary }) {
  const tone = clientTone(workflow.client)
  const badge = stateBadge(workflow)
  const editorUrl = workflowEditorUrl(workflow.id)

  return (
    <GlassCard
      depth="l3"
      surface="flat"
      tone="neutral"
      hoverable={false}
      className={cn('p-4 flex flex-col gap-3', borderByTone[tone])}
    >
      {/* En-tête : nom + badge d'état */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-cream-50 leading-snug truncate">
            {workflow.name}
          </h4>
          <span className="text-eyebrow text-muted-deeper">
            {formatRelative(workflow.lastRunAt)}
          </span>
        </div>
        <GlassBadge tone={badge.tone} className="gap-1 shrink-0">
          <badge.icon className={cn('h-3 w-3', badge.live && 'animate-pulse')} />
          {badge.label}
        </GlassBadge>
      </div>

      {/* Barre de taux de succès */}
      <SuccessBar rate={workflow.successRate24h} />

      {/* 3 métriques */}
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Exéc 24 h" value={String(workflow.exec24h)} />
        <Metric label="Succès" value={formatPct(workflow.successRate24h)} />
        <Metric label="Durée moy." value={formatDuration(workflow.avgDurationMs)} />
      </div>

      {/* Message d'erreur inline */}
      {workflow.status === 'error' && workflow.lastError && (
        <div className="flex items-start gap-2 rounded-lg bg-terracotta/10 border border-terracotta/25 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-terracotta shrink-0 mt-0.5" />
          <p className="text-xs text-terracotta-light leading-snug break-words">
            {workflow.lastError}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {editorUrl ? (
          <a
            href={editorUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-7 hover:bg-glass-10 border border-glass-10 text-xs text-cream-50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir dans n8n
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-7 border border-glass-10 text-xs text-muted-deeper">
            <ExternalLink className="h-3.5 w-3.5" />
            n8n
          </span>
        )}
        <button
          type="button"
          disabled
          title="Sprint 6"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-7 border border-glass-10 text-xs text-muted-deeper opacity-50 cursor-not-allowed"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Relancer
        </button>
        <button
          type="button"
          disabled
          title="Sprint 6"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-7 border border-glass-10 text-xs text-muted-deeper opacity-50 cursor-not-allowed"
        >
          <ScrollText className="h-3.5 w-3.5" />
          Logs
        </button>
      </div>
    </GlassCard>
  )
}
