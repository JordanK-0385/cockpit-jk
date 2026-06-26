import { useState } from 'react'
import {
  Lock, Trophy, Check, Play, ChevronDown, ArrowRight, Bell, X,
  Sprout, Flower2, Trees, Crown, PartyPopper,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { cn } from '@/lib/utils'
import { domaineTone } from '@/lib/domaines'
import { nextTheme, NIVEAUX_ORDER, type Parcours, type LevelProgress, type ThemeProgress, type Niveau } from '@/lib/parcours'
import type { Sujet } from '@/lib/apprentissage'

const LEVEL_ICON: Record<Niveau, typeof Sprout> = {
  'Débutant': Sprout,
  'Intermédiaire': Flower2,
  'Avancé': Trees,
  'Expert': Crown,
}

function BadgeMedallion({ niveau, earned }: { niveau: Niveau; earned: boolean }) {
  const Icon = LEVEL_ICON[niveau]
  return (
    <div
      title={earned ? `Badge ${niveau} acquis` : `Badge ${niveau} à débloquer`}
      className={cn(
        'h-9 w-9 rounded-full border flex items-center justify-center',
        earned ? 'bg-sage/15 border-sage/40 text-sage-light' : 'bg-glass-5 border-glass-10 text-muted-deeper',
      )}
    >
      <Icon className="h-4 w-4" />
    </div>
  )
}

function ThemeChip({ theme, playable, onStart }: { theme: ThemeProgress; playable: boolean; onStart: (s: Sujet) => void }) {
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
      title={theme.validated ? `Validé · meilleur ${theme.bestPct}%` : `${theme.sujet.domaine} · ${theme.sujet.niveau}`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-colors',
        theme.dueForReview
          ? 'bg-terracotta/12 border-terracotta/30 text-terracotta-light'
          : theme.validated
            ? 'bg-sage/15 border-sage/30 text-sage-light'
            : 'bg-glass-7 border-glass-10 text-cream-50 hover:bg-glass-10',
      )}
    >
      {theme.dueForReview ? (
        <Bell className="h-3 w-3" />
      ) : theme.validated ? (
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
  const Icon = LEVEL_ICON[level.niveau]

  return (
    <GlassCard
      depth="l3" surface="flat" tone={level.state === 'current' ? 'sage' : 'neutral'} hoverable={false}
      className={cn('p-0 overflow-hidden', locked && 'opacity-70')}
    >
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {level.state === 'acquired' ? <Trophy className="h-4 w-4 text-sage" />
              : level.state === 'current' ? <Play className="h-4 w-4 text-sage" />
              : <Lock className="h-4 w-4 text-muted-deeper" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted" />
                <p className="text-sm font-semibold text-cream-50 leading-tight">{level.niveau}</p>
                {level.state === 'acquired' && <GlassBadge tone="sage">Acquis</GlassBadge>}
                {level.state === 'current' && <GlassBadge tone="glacier">En cours</GlassBadge>}
              </div>
              <span className="text-[11px] text-muted-deeper">
                {locked ? 'Termine le niveau précédent pour débloquer'
                  : `${level.validatedCount}/${level.total} validé${level.validatedCount > 1 ? 's' : ''} · ${level.xp} XP`}
              </span>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted shrink-0 transition-transform', open && 'rotate-180')} />
        </div>
        {!locked && (
          <div className="h-1.5 w-full rounded-full bg-glass-7 overflow-hidden mt-3">
            <div className="h-full rounded-full bg-gradient-to-r from-sage to-sage-deep transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {level.themes.map((t) => <ThemeChip key={t.sujet.id} theme={t} playable={!locked} onStart={onStart} />)}
            {level.themes.length === 0 && <span className="text-xs text-muted-deeper">Aucun thème à ce niveau.</span>}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export function ParcoursView({
  parcours, onStart, celebrate, onDismissCelebrate,
}: {
  parcours: Parcours
  onStart: (s: Sujet) => void
  celebrate: Niveau | null
  onDismissCelebrate: () => void
}) {
  const next = nextTheme(parcours)
  const current = parcours.levels.find((l) => l.state === 'current')
  const curPct = current && current.total > 0 ? Math.round((current.validatedCount / current.total) * 100) : 100

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Banderole de passage de niveau */}
      {celebrate && (
        <GlassCard depth="l3" tone="sage" className="p-4" hoverable={false}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PartyPopper className="h-5 w-5 text-sage" />
              <p className="text-sm text-cream-50">
                Niveau <span className="font-semibold text-sage-light">{celebrate}</span> acquis ! Le niveau suivant est débloqué.
              </p>
            </div>
            <button onClick={onDismissCelebrate} className="text-muted hover:text-cream-50" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </GlassCard>
      )}

      {/* Bandeau de progression persistant */}
      <GlassCard depth="l3" tone="neutral" className="p-4" hoverable={false}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted">
                {parcours.currentNiveau ? `Niveau ${parcours.currentNiveau}` : 'Parcours terminé 🎉'}
              </span>
              <span className="text-xs text-muted-deeper">{parcours.totalXp} XP</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-glass-7 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-sage to-sage-deep transition-[width] duration-500" style={{ width: `${curPct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {NIVEAUX_ORDER.map((n) => (
              <BadgeMedallion key={n} niveau={n} earned={parcours.badges.includes(n)} />
            ))}
          </div>
        </div>
        {parcours.reviewCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-terracotta-light">
            <Bell className="h-3.5 w-3.5" />
            {parcours.reviewCount} thème{parcours.reviewCount > 1 ? 's' : ''} à réviser (anti-oubli)
          </div>
        )}
      </GlassCard>

      {/* Hero « Continuer » */}
      {next && (
        <GlassCard depth="l3" tone="sage" className="p-5" hoverable={false}>
          <span className="eyebrow">{next.dueForReview ? 'À réviser' : 'Prochain dans ton parcours'}</span>
          <div className="flex items-center justify-between gap-4 flex-wrap mt-2">
            <div className="min-w-0">
              <p className="text-base font-semibold text-cream-50 leading-tight">{next.sujet.theme}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded-full border bg-glass-7 border-glass-10 text-muted">
                {next.sujet.domaine} · {next.sujet.niveau}
              </span>
            </div>
            <GlassButton variant="sage" size="lg" onClick={() => onStart(next.sujet)}>
              {next.dueForReview ? 'Réviser' : 'Démarrer le quiz'}
              <ArrowRight className="h-4 w-4" />
            </GlassButton>
          </div>
        </GlassCard>
      )}

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
