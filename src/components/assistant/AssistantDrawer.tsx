import { useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { ColumnCenter } from '@/components/cockpit/ColumnCenter'
import type { AssistantContextValue } from './AssistantProvider'

/**
 * Slide-over droite hébergeant le chat existant (`ColumnCenter`, réutilisé tel
 * quel via une prop optionnelle `contextPrefill`). Fermeture Échap / clic
 * overlay. Monté uniquement quand ouvert pour ne pas voler le focus au repos.
 */
export function AssistantDrawer({
  isOpen,
  context,
  onClose,
}: {
  isOpen: boolean
  context: AssistantContextValue | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const prefill = context?.client
    ? `Travaillons sur ${context.client}. `
    : undefined

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Assistant">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Fermer l'assistant"
        onClick={onClose}
        className="absolute inset-0 bg-ink-deepest/60 backdrop-blur-sm"
      />

      {/* Panneau */}
      <aside className="relative h-full w-full max-w-[560px] bg-ink-deepest/80 border-l border-glass-10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b border-glass-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sage" />
            <span className="text-sm font-medium text-cream-50">Assistant</span>
            {context?.client && <span className="eyebrow">· {context.client}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-glass-7 hover:bg-glass-10 border border-glass-10 text-muted hover:text-cream-50 text-xs transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Échap
          </button>
        </div>

        {/* Le chat existant, inchangé hormis le préremplissage optionnel */}
        <div className="flex-1 min-h-0">
          <ColumnCenter contextPrefill={prefill} />
        </div>
      </aside>
    </div>
  )
}
