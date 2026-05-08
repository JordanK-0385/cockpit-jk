import { Eye, Calendar, Clock } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { Skeleton } from '@/components/ui/Loader'
import { useRecentSessions } from '@/lib/queries'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const VEILLE_PLACEHOLDERS = [
  {
    source: 'Anthropic',
    title: 'Sortie de Claude Sonnet 4.6',
    summary:
      'Capacités étendues sur le tool use et le streaming. Branche Sprint 2.',
    score: 92,
    tone: 'sage' as const,
  },
  {
    source: 'n8n',
    title: 'Nouveau node Gmail v2.1',
    summary:
      'Threading natif, attachments multiples, OAuth simplifié.',
    score: 78,
    tone: 'glacier' as const,
  },
  {
    source: 'OpenAI',
    title: 'Realtime API en GA',
    summary:
      'Voix sortante latence < 200ms. À tester pour la veille audio JK.',
    score: 71,
    tone: 'glacier' as const,
  },
]

export function ColumnLeft() {
  const sessions = useRecentSessions(3)

  return (
    <aside className="col-scroll px-4 py-5 space-y-7 border-r border-glass-10">
      {/* Veille */}
      <section>
        <SectionHeader icon={<Eye className="h-3.5 w-3.5" />} label="Veille active" />
        <div className="space-y-3 mt-3">
          {VEILLE_PLACEHOLDERS.map((v, i) => (
            <GlassCard key={i} depth="l3" tone={v.tone} className="p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <GlassBadge tone={v.tone}>{v.source}</GlassBadge>
                <span className="text-eyebrow text-muted-deeper">{v.score}</span>
              </div>
              <h4 className="text-sm font-medium text-cream-50 leading-snug mb-1">
                {v.title}
              </h4>
              <p className="text-xs text-muted leading-relaxed">{v.summary}</p>
            </GlassCard>
          ))}
          <p className="text-eyebrow text-muted-deeper px-1 pt-1">
            Sprint 3 · branche les sources réelles
          </p>
        </div>
      </section>

      {/* Calendrier */}
      <section>
        <SectionHeader icon={<Calendar className="h-3.5 w-3.5" />} label="Calendrier" />
        <div className="mt-3 space-y-2">
          <GlassCard depth="l3" tone="neutral" className="p-3.5" hoverable={false}>
            <p className="text-xs text-muted">
              Google Calendar sera branché en Sprint 4.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Sessions récentes */}
      <section>
        <SectionHeader icon={<Clock className="h-3.5 w-3.5" />} label="Sessions récentes" />
        <div className="mt-3 space-y-2">
          {sessions.isLoading && (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          )}
          {sessions.error && (
            <GlassCard depth="l3" tone="terracotta" className="p-3" hoverable={false}>
              <p className="text-xs text-terracotta-light">
                Impossible de charger les sessions Airtable.
              </p>
            </GlassCard>
          )}
          {sessions.data?.length === 0 && (
            <p className="text-xs text-muted-deeper px-1">Pas de session enregistrée.</p>
          )}
          {sessions.data?.map((s) => {
            const dateStr = s.fields['Date']
            const date = dateStr ? parseISO(dateStr) : null
            return (
              <GlassCard key={s.id} depth="l3" tone="neutral" className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <GlassBadge>{s.fields['Type'] ?? 'Session'}</GlassBadge>
                  {date && (
                    <span className="text-eyebrow text-muted-deeper">
                      {format(date, 'd MMM', { locale: fr })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted line-clamp-2">
                  {s.fields['Résumé'] ?? '—'}
                </p>
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
