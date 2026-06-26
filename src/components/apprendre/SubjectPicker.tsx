import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { cn } from '@/lib/utils'
import type { Sujet } from '@/lib/apprentissage'

const NIVEAUX = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'] as const

export function SubjectPicker({
  sujets,
  selectedId,
  niveau,
  onSelect,
  onNiveau,
}: {
  sujets: Sujet[]
  selectedId: string | null
  niveau: string
  onSelect: (s: Sujet) => void
  onNiveau: (n: string) => void
}) {
  // Regroupe les sujets par domaine pour la lisibilité.
  const byDomaine = new Map<string, Sujet[]>()
  for (const s of sujets) {
    const arr = byDomaine.get(s.domaine || 'Autres') ?? []
    arr.push(s)
    byDomaine.set(s.domaine || 'Autres', arr)
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="eyebrow">Niveau visé</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {NIVEAUX.map((n) => (
            <button
              key={n}
              onClick={() => onNiveau(n)}
              className={cn(
                'px-3 py-1.5 rounded-full border text-xs transition-colors',
                niveau === n
                  ? 'bg-sage/15 border-sage/30 text-sage-light'
                  : 'bg-glass-7 border-glass-10 text-muted hover:text-cream-50',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {[...byDomaine.entries()].map(([domaine, items]) => (
        <div key={domaine}>
          <span className="eyebrow">{domaine}</span>
          <div className="mt-2 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {items.map((s) => {
              const active = s.id === selectedId
              return (
                <button key={s.id} onClick={() => onSelect(s)} className="text-left">
                  <GlassCard
                    depth={active ? 'l3' : 'flat'}
                    surface="flat"
                    tone={active ? 'sage' : 'neutral'}
                    hoverable={!active}
                    className={cn('p-3.5 h-full', active && 'ring-1 ring-sage/40')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-cream-50 leading-snug">{s.theme}</p>
                      {s.priorite && (
                        <GlassBadge tone={s.priorite.includes('Haute') ? 'terracotta' : 'neutral'}>
                          {s.niveau}
                        </GlassBadge>
                      )}
                    </div>
                    {s.referentiels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.referentiels.map((r) => (
                          <GlassBadge key={r} tone="glacier">
                            {r}
                          </GlassBadge>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
