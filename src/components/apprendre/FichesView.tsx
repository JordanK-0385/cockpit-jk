import { useState } from 'react'
import { BookOpen, AlertCircle, ChevronDown, PenLine, Lightbulb, Dumbbell, Network } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { Skeleton } from '@/components/ui/Loader'
import { SchemaDiagram } from '@/components/apprendre/SchemaDiagram'
import { ScoreRing } from '@/components/apprendre/ScoreRing'
import { cn } from '@/lib/utils'
import { domaineTone } from '@/lib/domaines'
import type { Fiche } from '@/lib/fiches'

function FicheCard({ fiche, onTrain }: { fiche: Fiche; onTrain: (f: Fiche) => void }) {
  const [open, setOpen] = useState(false)
  const tone = domaineTone(fiche.domaine)

  return (
    <GlassCard
      depth="l3"
      surface="flat"
      tone="neutral"
      hoverable={false}
      className={cn('p-0 overflow-hidden border-l-2', tone.accent)}
    >
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {fiche.domaine && (
              <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border', tone.chip)}>
                {fiche.domaine}
              </span>
            )}
            <p className="text-sm font-medium text-cream-50 leading-snug mt-1.5">{fiche.sujet}</p>
            <span className="text-[11px] text-muted-deeper">
              {fiche.date}
              {fiche.niveau ? ` · ${fiche.niveau}` : ''} · {fiche.enseignements.length} idée
              {fiche.enseignements.length > 1 ? 's' : ''} · {fiche.glossaire.length} terme
              {fiche.glossaire.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {fiche.score && <ScoreRing pct={fiche.pourcentage} size={44} />}
            <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-180')} />
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {fiche.schema && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Network className="h-3.5 w-3.5 text-glacier" />
                <span className="eyebrow">Schéma</span>
              </div>
              <SchemaDiagram schema={fiche.schema} />
            </div>
          )}

          {fiche.enseignements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-sage" />
                <span className="eyebrow">À retenir</span>
              </div>
              <div className="space-y-1.5">
                {fiche.enseignements.map((e, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-sage/[0.08] border-l-2 border-sage/50 px-3 py-2">
                    <span className="text-xs font-medium text-sage-light shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[13px] text-cream-100 leading-snug">{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fiche.glossaire.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-3.5 w-3.5 text-glacier" />
                <span className="eyebrow">Glossaire</span>
              </div>
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                {fiche.glossaire.map((g, i) => (
                  <div key={i} className="rounded-xl bg-glass-5 border border-glass-10 px-3 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border bg-glacier/15 border-glacier/30 text-glacier-light">
                      {g.terme}
                    </span>
                    {g.definition && (
                      <p className="text-[12px] text-muted mt-1.5 leading-snug">{g.definition}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fiche.trace && (
            <div className="flex items-start gap-2.5 rounded-xl bg-terracotta/10 border-l-2 border-terracotta/50 px-3.5 py-3">
              <PenLine className="h-4 w-4 text-terracotta shrink-0 mt-0.5" />
              <div>
                <span className="eyebrow text-terracotta-light">Ma trace</span>
                <p className="text-[13px] text-cream-50 mt-1 leading-snug whitespace-pre-wrap">{fiche.trace}</p>
              </div>
            </div>
          )}

          <div className="pt-1">
            <GlassButton variant="sage" size="sm" onClick={() => onTrain(fiche)}>
              <Dumbbell className="h-3.5 w-3.5" />
              S'entraîner sur ce thème
            </GlassButton>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export function FichesView({
  fiches,
  loading,
  error,
  onTrain,
}: {
  fiches: Fiche[]
  loading: boolean
  error: Error | null
  onTrain: (f: Fiche) => void
}) {
  if (loading) {
    return (
      <div className="space-y-3 max-w-3xl">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (error) {
    return (
      <GlassCard depth="l3" tone="terracotta" className="p-5 max-w-3xl" hoverable={false}>
        <div className="flex items-start gap-2 text-sm text-terracotta-light">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Impossible de charger les fiches.</p>
            <p className="text-xs text-muted mt-1">{error.message}</p>
          </div>
        </div>
      </GlassCard>
    )
  }
  if (fiches.length === 0) {
    return (
      <GlassCard depth="l3" tone="neutral" className="p-8 text-center max-w-3xl" hoverable={false}>
        <div className="flex flex-col items-center gap-2">
          <BookOpen className="h-7 w-7 text-muted-deeper" />
          <p className="text-sm text-muted">Aucune fiche encore. Termine un quiz et enregistre ta session.</p>
        </div>
      </GlassCard>
    )
  }
  return (
    <div className="space-y-3 max-w-3xl">
      {fiches.map((f) => (
        <FicheCard key={f.id} fiche={f} onTrain={onTrain} />
      ))}
    </div>
  )
}
