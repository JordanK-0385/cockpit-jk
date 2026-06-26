import { useState } from 'react'
import { Lock, Trophy, Check, Play, Award, ChevronDown, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { cn } from '@/lib/utils'
import { domaineTone } from '@/lib/domaines'
import type { Parcours, LevelProgress, ThemeProgress } from '@/lib/parcours'
import type { Sujet } from '@/lib/apprentissage'

function LevelIcon({ state }: { state: LevelProgress['state'] }) {
  if (state === 'acquired') return <Trophy className="h-4 w-4 text-sage" />
  if (state === 'current') return <Play className="h-4 w-4 text-sage" />
  return <Lock className="h-4 w-4 text-muted-deeper" />
}

function ThemeChip({
  theme,
  playable,
  onStart,
}: {
  theme: ThemeProgress
  playable: boolean
  onStart: (s: Sujet) => void
}) {
  const tone = domaineTone(theme.sujet.domaine)
  if (!playable) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-glass-10 bg-glass-5 text-[11px] text-muted-deeper">
        <Lock className="h-3 w-3" />
        {theme.sujet.theme}
      </span>
    )
  }
  return (
    <button
      onClick={() => onStart(theme.sujet)}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-colors',
        theme.validated
          ? 'bg-sage/15 border-sage/30 text-sage-light'
          : 'bg-glass-7 border-glass-10 text-cream-50 hover:bg-glass-10',
      )}
      title={theme.validated ? `Validé · meilleur ${theme.bestPct}%` : `${theme.sujet.domaine} · ${theme.sujet.niveau}`}
    >
      {theme.validated ? (
        <Check className="h-3 w-3 text-sage" />
      ) : (
        <span className={cn('h-2 w-2 rounded-full border', tone.chip)} />
      )}
      {theme.sujet.theme}
    </button>
  )
}

function LevelCard({ level, onStart }: { level: LevelProgress; onStart: (s: Sujet) => void }) {
  const locked = level.state === 'locked'
  const [open, setOpen] = useState(level.state === 'current')
  const pct = level.total > 0 ? Math.round((level.validatedCount / level.total) * 100) : 0

  return (
    <GlassCard
      depth="l3"
      surface="flat"
      tone={level.state === 'current' ? 'sage' : 'neutral'}
      hoverable={false}
      className={cn('p-0 overflow-hidden', locked && 'opacity-70')}
    >
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <LevelIcon state={level.state} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-cream-50 leading-tight">{level.niveau}</p>
                {level.state === 'acquired' && <GlassBadge tone="sage">Acquis</GlassBadge>}
                {level.state === 'current' && <GlassBadge tone="glacier">En cours</GlassBadge>}
              </div>
              <span className="text-[11px] text-muted-deeper">
                {locked
                  ? 'Termine le niveau précédent pour débloquer'
                  : `${level.validatedCount}/${level.total} thème${level.total > 1 ? 's' : ''} validé${level.validatedCount > 1 ? 's' : ''} · ${level.xp} XP`}
              </span>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted shrink-0 transition-transform', open && 'rotate-180')} />
        </div>

        {!locked && (
          <div className="h-1.5 w-full rounded-full bg-glass-7 overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sage to-sage-deep transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {level.themes.map((t) => (
              <ThemeChip key={t.sujet.id} theme={t} playable={!locked} onStart={onStart} />
            ))}
            {level.themes.length === 0 && (
              <span className="text-xs text-muted-deeper">Aucun thème à ce niveau pour l'instant.</span>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export function ParcoursView({
  parcours,
  onStart,
}: {
  parcours: Parcours
  onStart: (s: Sujet) => void
}) {
  return (
    <div className="space-y-4 max-w-3xl">
      {/* Résumé */}
      <GlassCard depth="l3" tone="neutral" className="p-5" hoverable={false}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-sage" />
            <div>
              <p className="text-base font-semibold text-cream-50 leading-tight">
                {parcours.currentNiveau ? `Niveau ${parcours.currentNiveau}` : 'Parcours terminé 🎉'}
              </p>
              <span className="eyebrow">{parcours.totalXp} XP cumulés</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlassBadge tone="sage" className="gap-1">
              <Award className="h-3 w-3" />
              {parcours.badges.length} niveau{parcours.badges.length > 1 ? 'x' : ''} acquis
            </GlassBadge>
          </div>
        </div>
      </GlassCard>

      {/* Échelle des niveaux */}
      {parcours.levels.map((lvl) => (
        <LevelCard key={lvl.niveau} level={lvl} onStart={onStart} />
      ))}

      <p className="text-eyebrow text-muted-deeper px-1">
        Un thème est validé à 100 % au QCM. Valide tous les thèmes d'un niveau pour débloquer le suivant.
      </p>
    </div>
  )
}
