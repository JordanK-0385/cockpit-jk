import { History, Target } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { Skeleton } from '@/components/ui/Loader'
import { aggregateBySubject, type QuizAttempt } from '@/lib/quiz-stats'

function pctTone(pct: number): 'sage' | 'glacier' | 'terracotta' {
  if (pct >= 80) return 'sage'
  if (pct >= 50) return 'glacier'
  return 'terracotta'
}

export function ScorePanel({
  attempts,
  loading,
}: {
  attempts: QuizAttempt[]
  loading: boolean
}) {
  const stats = aggregateBySubject(attempts)
  const totalAttempts = attempts.length

  return (
    <GlassCard depth="l3" tone="neutral" className="p-5" hoverable={false}>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-sage" />
        <div>
          <h3 className="text-sm font-semibold text-cream-50 leading-tight">Ma progression</h3>
          <span className="eyebrow">
            {totalAttempts} session{totalAttempts > 1 ? 's' : ''} · {stats.length} sujet
            {stats.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}

      {!loading && stats.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Target className="h-7 w-7 text-muted-deeper" />
          <p className="text-xs text-muted">Aucune session encore. Lance un premier quiz.</p>
        </div>
      )}

      {!loading && stats.length > 0 && (
        <ul className="space-y-2">
          {stats.map((s) => (
            <li
              key={s.sujetId || s.sujet}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-glass-7 border border-glass-10"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-cream-50 truncate">{s.sujet}</p>
                <span className="text-[11px] text-muted-deeper">
                  {s.attempts} tentative{s.attempts > 1 ? 's' : ''} · dernier {s.lastPct}%
                </span>
              </div>
              <GlassBadge tone={pctTone(s.bestPct)}>{s.bestPct}%</GlassBadge>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
