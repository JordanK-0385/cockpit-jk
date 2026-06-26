import { useState } from 'react'
import { BookOpen, AlertCircle, ChevronDown, PenLine } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { Skeleton } from '@/components/ui/Loader'
import { cn } from '@/lib/utils'
import type { Fiche } from '@/lib/fiches'

function pctTone(pct: number): 'sage' | 'glacier' | 'terracotta' {
  if (pct >= 80) return 'sage'
  if (pct >= 50) return 'glacier'
  return 'terracotta'
}

function FicheCard({ fiche }: { fiche: Fiche }) {
  const [open, setOpen] = useState(false)
  return (
    <GlassCard depth="l3" surface="flat" tone="neutral" className="p-4" hoverable={false}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-cream-50 leading-snug">{fiche.sujet}</p>
            <span className="text-[11px] text-muted-deeper">
              {fiche.date}
              {fiche.niveau ? ` · ${fiche.niveau}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {fiche.score && <GlassBadge tone={pctTone(fiche.pourcentage)}>{fiche.score}</GlassBadge>}
            <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-180')} />
          </div>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {fiche.enseignements && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="h-3.5 w-3.5 text-glacier" />
                <span className="eyebrow">À retenir</span>
              </div>
              <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{fiche.enseignements}</p>
            </div>
          )}
          {fiche.glossaire && (
            <div>
              <span className="eyebrow">Glossaire</span>
              <p className="mt-1.5 text-xs text-muted leading-relaxed whitespace-pre-wrap">{fiche.glossaire}</p>
            </div>
          )}
          {fiche.trace && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <PenLine className="h-3.5 w-3.5 text-sage" />
                <span className="eyebrow">Ma trace</span>
              </div>
              <p className="text-xs text-cream-50 leading-relaxed whitespace-pre-wrap">{fiche.trace}</p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}

export function FichesView({
  fiches,
  loading,
  error,
}: {
  fiches: Fiche[]
  loading: boolean
  error: Error | null
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
        <FicheCard key={f.id} fiche={f} />
      ))}
    </div>
  )
}
