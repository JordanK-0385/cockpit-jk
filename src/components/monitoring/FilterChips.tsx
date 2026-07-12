import { cn } from '@/lib/utils'
import { FILTERS, type FilterKey } from './filters'

/**
 * Rangée de chips-filtres au-dessus de la grille (lot A + C/D). Un seul filtre
 * actif à la fois, filtrage côté client. Chaque chip porte son compteur ;
 * les chips à 0 (hors « Toutes ») sont grisées mais restent visibles.
 */
export function FilterChips({
  active,
  counts,
  onChange,
}: {
  active: FilterKey
  counts: Record<FilterKey, number>
  onChange: (key: FilterKey) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const count = counts[f.key]
        const isActive = active === f.key
        const empty = count === 0 && f.key !== 'all'
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors',
              isActive
                ? 'bg-sage/15 border-sage/30 text-sage-light'
                : 'bg-glass-7 border-glass-10 text-muted hover:text-cream-50',
              empty && !isActive && 'opacity-45',
            )}
          >
            <span>{f.label}</span>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] tabular-nums',
                isActive ? 'bg-sage/25 text-sage-light' : 'bg-glass-10 text-muted-deeper',
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
