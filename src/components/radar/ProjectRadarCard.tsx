import { AlertTriangle, ListChecks, ChevronRight } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { cn } from '@/lib/utils'
import type { RadarProject, RadarTask } from '@/lib/radar'

function priorityTone(priorite: string): 'terracotta' | 'glacier' | 'neutral' {
  const p = priorite.toLowerCase()
  if (p.includes('haute')) return 'terracotta'
  if (p.includes('moyenne')) return 'glacier'
  return 'neutral'
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="h-1.5 w-full rounded-full bg-glass-7 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-sage to-sage-deep transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function NextTask({ task }: { task: RadarTask }) {
  return (
    <GlassCard depth="flat" surface="flat" tone="neutral" hoverable={false} className="p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <ChevronRight className="h-3.5 w-3.5 text-sage" />
        <span className="eyebrow">Prochaine tâche</span>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-cream-50 leading-snug">{task.titre}</p>
        {task.priorite && (
          <GlassBadge tone={priorityTone(task.priorite)}>{task.priorite}</GlassBadge>
        )}
      </div>

      {task.subtasks.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {task.subtasks.slice(0, 5).map((s) => (
            <li key={s.id} className="flex items-start gap-2 text-xs text-muted">
              <span
                className={cn(
                  'mt-[3px] h-3 w-3 shrink-0 rounded-[4px] border',
                  s.fait
                    ? 'bg-sage/30 border-sage/50'
                    : 'bg-transparent border-glass-16',
                )}
                aria-hidden="true"
              />
              <span className={cn('leading-snug', s.fait && 'line-through text-muted-deeper')}>
                {s.action}
              </span>
            </li>
          ))}
        </ul>
      ) : task.details ? (
        <p className="mt-2 text-xs text-muted leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {task.details}
        </p>
      ) : null}
    </GlassCard>
  )
}

export function ProjectRadarCard({ project }: { project: RadarProject }) {
  return (
    <GlassCard depth="l3" surface="flat" tone="neutral" className="p-5 flex flex-col gap-4">
      {/* En-tête */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <span className="text-eyebrow text-muted-deeper uppercase tracking-wider">
              {project.client}
            </span>
            <h3 className="text-base font-semibold text-cream-50 leading-tight truncate">
              {project.nom}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {project.isBlocked && (
              <GlassBadge tone="terracotta" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Bloqué
              </GlassBadge>
            )}
            <GlassBadge tone="sage">{project.avancementPct}%</GlassBadge>
          </div>
        </div>
        <ProgressBar pct={project.avancementPct} />
      </div>

      {/* Thèmes majeurs */}
      {project.themes.length > 0 && (
        <div>
          <span className="eyebrow">Thèmes majeurs</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {project.themes.map((t) => (
              <GlassBadge key={t} tone="glacier">
                {t}
              </GlassBadge>
            ))}
          </div>
        </div>
      )}

      {/* Prochaine tâche */}
      {project.nextTask ? (
        <NextTask task={project.nextTask} />
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-deeper px-1">
          <ListChecks className="h-3.5 w-3.5" />
          Aucune tâche ouverte rattachée.
        </div>
      )}
    </GlassCard>
  )
}
