import { useEffect, useRef, useState } from 'react'
import { Zap, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/lib/preferences'

/**
 * Header button + popover that lets the user toggle the global
 * Performance Mode. Auto-applied (locked) when the OS prefers
 * reduced motion.
 */
export function PerformanceToggle() {
  const { prefs, reducedMotion, effectivePerformanceMode, setPerformanceMode } =
    usePreferences()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const checked = prefs.performanceMode
  const disabled = reducedMotion

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Mode performance"
        aria-expanded={open}
        title={
          effectivePerformanceMode
            ? 'Mode performance actif'
            : 'Mode performance'
        }
        className={cn(
          'h-9 w-9 rounded-full border border-glass-10 backdrop-blur-glass',
          'flex items-center justify-center transition-colors',
          effectivePerformanceMode
            ? 'bg-sage/20 text-sage-light border-sage/40'
            : 'bg-glass-7 text-muted hover:text-cream-50 hover:bg-glass-10',
        )}
      >
        <Zap className="h-4 w-4" strokeWidth={2} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Préférences performance"
          className={cn(
            'absolute right-0 top-11 z-40 w-72 p-4 rounded-2xl',
            'glass-base glass-tone-sage relative',
            // glass-base already has the light bar via :before pattern is via a span,
            // so we render a static popover without the depth transforms.
            'shadow-2xl',
          )}
        >
          <span className="glass-light-bar" />

          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-medium text-cream-50">Mode performance</p>
              <p className="text-xs text-muted-deeper leading-relaxed mt-0.5">
                Désactive orbes, particules, bokeh et grain.
                Garde le glass minimal et les pulses critiques.
              </p>
            </div>
            <Switch
              checked={checked || reducedMotion}
              disabled={disabled}
              onChange={(next) => void setPerformanceMode(next)}
            />
          </div>

          {reducedMotion && (
            <div className="flex items-start gap-2 text-xs text-sage-light bg-sage/10 border border-sage/20 rounded-lg px-3 py-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Activé automatiquement par ton OS
                (<code className="font-mono">prefers-reduced-motion: reduce</code>).
              </span>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-glass-10 text-[11px] text-muted-deeper leading-relaxed">
            Préférence sauvegardée sur ton profil Firestore.
          </div>
        </div>
      )}
    </div>
  )
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-deepest',
        checked ? 'bg-sage/40 border border-sage/50' : 'bg-glass-10 border border-glass-16',
        disabled && 'opacity-70 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-cream-50 transition-transform shadow',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}
