import { Target, Folders, ListChecks, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { Skeleton } from '@/components/ui/Loader'
import { useProjects, useActiveTasks, useTodaysFocus } from '@/lib/queries'
import { cn } from '@/lib/utils'

export function ColumnRight() {
  const focus = useTodaysFocus()
  const projects = useProjects()
  const tasks = useActiveTasks()

  return (
    <aside className="col-scroll px-4 py-5 space-y-7 border-l border-glass-10">
      {/* Focus du jour */}
      <section>
        <SectionHeader icon={<Target className="h-3.5 w-3.5" />} label="Focus du jour" />
        <div className="mt-3">
          {focus.isLoading ? (
            <Skeleton className="h-24" />
          ) : focus.data?.fields['Focus du jour'] ? (
            <GlassCard depth="l2" tone="sage" className="p-4">
              <p className="text-eyebrow text-muted-deeper mb-2">Objectif principal</p>
              <p className="text-sm text-cream-50 leading-relaxed font-medium">
                {focus.data.fields['Focus du jour']}
              </p>
            </GlassCard>
          ) : (
            <GlassCard depth="l3" tone="terracotta" surface="flat" className="p-4" hoverable={false}>
              <p className="text-xs text-terracotta-light leading-relaxed">
                Pas de focus défini. Lance un Check-in (Sprint 4) pour le poser.
              </p>
            </GlassCard>
          )}
        </div>
      </section>

      {/* Projets actifs */}
      <section>
        <SectionHeader icon={<Folders className="h-3.5 w-3.5" />} label="Projets actifs" />
        <div className="mt-3 space-y-2">
          {projects.isLoading && (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          )}
          {projects.error && (
            <GlassCard depth="l3" tone="terracotta" surface="flat" className="p-3" hoverable={false}>
              <p className="text-xs text-terracotta-light">
                Impossible de charger les projets Airtable.
              </p>
            </GlassCard>
          )}
          {projects.data?.length === 0 && (
            <p className="text-xs text-muted-deeper px-1">Aucun projet actif.</p>
          )}
          {projects.data?.map((p) => {
            const f = p.fields
            const adv = typeof f['% Avancement'] === 'number'
              ? Math.round((f['% Avancement'] as number) * 100)
              : null
            return (
              <GlassCard key={p.id} depth="l3" tone="sage" surface="flat" className="p-3.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-medium text-cream-50 leading-snug">
                    {f['Nom du projet']}
                  </h4>
                  {f['Priorité'] && (
                    <span className="text-[11px] shrink-0">{f['Priorité']}</span>
                  )}
                </div>
                {f['Description'] && (
                  <p className="text-xs text-muted line-clamp-2 mb-2">
                    {f['Description']}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  {f['Statut'] && <GlassBadge tone="sage">{f['Statut']}</GlassBadge>}
                  {adv !== null && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-1 w-16 rounded-full bg-glass-10 overflow-hidden">
                        <div
                          className="h-full bg-sage rounded-full"
                          style={{ width: `${adv}%` }}
                        />
                      </div>
                      <span className="text-eyebrow text-muted-deeper tabular-nums">
                        {adv}%
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>

      {/* Missions actives */}
      <section>
        <SectionHeader icon={<ListChecks className="h-3.5 w-3.5" />} label="Missions actives" />
        <div className="mt-3 space-y-2">
          {tasks.isLoading && (
            <>
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </>
          )}
          {tasks.data?.length === 0 && (
            <p className="text-xs text-muted-deeper px-1">Aucune mission active.</p>
          )}
          {tasks.data?.slice(0, 30).map((t) => {
            const f = t.fields
            const isBlocker = f['Bloquant'] === true || f["Type d'item"] === 'Bloquant'
            const tone = isBlocker ? 'terracotta' : f['Priorité'] === '🔴 Haute' ? 'terracotta' : 'glacier'
            return (
              <GlassCard
                key={t.id}
                depth="l3"
                tone={tone}
                surface="flat"
                className={cn('p-3', isBlocker && 'border-terracotta/40')}
              >
                <div className="flex items-start gap-2">
                  {isBlocker && (
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-terracotta shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-cream-50 leading-snug truncate">
                      {f['Titre de la tâche']}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {f['Statut'] && (
                        <span className="text-[11px] text-muted">{f['Statut']}</span>
                      )}
                      {f['Priorité'] && (
                        <span className="text-[11px]">{f['Priorité']}</span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>
    </aside>
  )
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-sage">{icon}</span>
      <span className="eyebrow">{label}</span>
    </div>
  )
}
