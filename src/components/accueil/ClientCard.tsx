import { ArrowRight, CalendarPlus, ExternalLink, ListChecks, AlertTriangle, Clock } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { cn } from '@/lib/utils'
import { useAssistant } from '@/components/assistant/AssistantProvider'
import type { BoardClient, BoardTone } from '@/lib/board'

const topBorder: Record<BoardTone, string> = {
  sage: 'border-t-2 border-t-sage/60',
  glacier: 'border-t-2 border-t-glacier/60',
  terracotta: 'border-t-2 border-t-terracotta/60',
  neutral: 'border-t-2 border-t-glass-16',
}

function ageLabel(client: BoardClient): { text: string; tone: 'sage' | 'terracotta' | 'neutral' } {
  if (client.ageDays === null) return { text: 'Pas d’activité récente', tone: 'neutral' }
  const d = client.ageDays
  const rel = d <= 0 ? "aujourd'hui" : `il y a ${d} j`
  return { text: `Dernière activité ${rel}`, tone: client.neglected ? 'terracotta' : 'sage' }
}

export function ClientCard({ client }: { client: BoardClient }) {
  const { open } = useAssistant()
  const age = ageLabel(client)

  return (
    <GlassCard
      depth="l3"
      surface="flat"
      tone="neutral"
      hoverable={false}
      className={cn('p-5 flex flex-col gap-4', topBorder[client.tone])}
    >
      {/* En-tête */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="min-w-0">
            <span className="text-eyebrow text-muted-deeper uppercase tracking-wider">
              {client.typeLabel}
            </span>
            <h3 className="text-base font-semibold text-cream-50 leading-tight truncate">
              {client.client}
            </h3>
          </div>
          <GlassBadge tone={client.tone === 'terracotta' ? 'terracotta' : 'sage'} className="shrink-0">
            {client.statut}
          </GlassBadge>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs',
            age.tone === 'terracotta' && 'text-terracotta-light',
            age.tone === 'sage' && 'text-sage-light',
            age.tone === 'neutral' && 'text-muted-deeper',
          )}
        >
          <Clock className="h-3 w-3 shrink-0" />
          <span>{age.text}</span>
        </div>
      </div>

      {/* Tâches ouvertes + bloquants */}
      <div className="flex items-center gap-2 flex-wrap">
        <GlassBadge tone="neutral" className="gap-1">
          <ListChecks className="h-3 w-3" />
          {client.openTasks} tâche{client.openTasks > 1 ? 's' : ''} ouverte{client.openTasks > 1 ? 's' : ''}
        </GlassBadge>
        {client.blockers > 0 && (
          <GlassBadge tone="terracotta" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {client.blockers} bloquant{client.blockers > 1 ? 's' : ''}
          </GlassBadge>
        )}
        {client.projectCount > 1 && (
          <span className="text-eyebrow text-muted-deeper">{client.projectCount} projets</span>
        )}
      </div>

      {/* Retainer : jours ce mois (stub, non tracké) */}
      {client.isRetainer && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="eyebrow">Jours ce mois · —/10</span>
            <button
              type="button"
              disabled
              title="Suivi des jours à brancher (Sprint suivant)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-glass-7 border border-glass-10 text-[11px] text-muted-deeper opacity-50 cursor-not-allowed"
            >
              <CalendarPlus className="h-3 w-3" />
              Valider une journée
            </button>
          </div>
          <div className="h-1.5 w-full rounded-full bg-glass-7 overflow-hidden">
            <div className="h-full w-0 rounded-full bg-sage/40" />
          </div>
        </div>
      )}

      {/* Dernière session + reprise */}
      {client.lastSession ? (
        <div className="rounded-lg bg-glass-7 border border-glass-10 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow">Dernière session · {client.lastSession.type}</span>
          </div>
          {client.lastSession.summary && (
            <p className="text-xs text-muted leading-snug line-clamp-2">{client.lastSession.summary}</p>
          )}
          {client.lastSession.url && (
            <a
              href={client.lastSession.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-glacier-light hover:text-glacier transition-colors"
            >
              Reprendre la conversation
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-deeper">Aucune session enregistrée.</p>
      )}

      {/* CTA Travailler */}
      <button
        type="button"
        onClick={() => open({ client: client.client })}
        className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sage/15 hover:bg-sage/25 border border-sage/30 text-cream-50 text-sm font-medium transition-colors"
      >
        Travailler
        <ArrowRight className="h-4 w-4" />
      </button>
    </GlassCard>
  )
}
