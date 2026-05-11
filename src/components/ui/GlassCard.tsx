import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Depth = 'l1' | 'l2' | 'l3' | 'flat'
type Tone = 'sage' | 'glacier' | 'terracotta' | 'neutral'
/**
 * surface="glass" → structural surface, real `backdrop-filter` blur.
 * surface="flat"  → leaf surface, no backdrop-filter (no compositor
 *                   layer dedicated to a GPU blur shader). Visually
 *                   near-identical thanks to the `bg-glass-7` fill
 *                   and the inset+drop shadows on `.glass-flat`.
 *
 * Use `surface="flat"` for any leaf card that appears in many copies
 * (projets, missions, sessions, veille items, user bubbles). The GPU
 * cost scales linearly with the number of backdrop-filter surfaces —
 * keeping them on a handful of structural elements is the
 * single-biggest perf win.
 */
type Surface = 'glass' | 'flat'

type Props = HTMLAttributes<HTMLDivElement> & {
  depth?: Depth
  tone?: Tone
  surface?: Surface
  hoverable?: boolean
  children?: ReactNode
}

const depthClass: Record<Depth, string> = {
  l1: 'glass-l1',
  l2: 'glass-l2',
  l3: 'glass-l3',
  flat: '',
}

export function GlassCard({
  depth = 'l3',
  tone = 'neutral',
  surface = 'glass',
  hoverable = true,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        surface === 'glass' ? 'glass-base' : 'glass-flat',
        'relative overflow-hidden',
        `glass-tone-${tone}`,
        depthClass[depth],
        !hoverable && 'pointer-events-auto [&:hover]:transform-none',
        className,
      )}
      {...rest}
    >
      <span className="glass-light-bar" />
      {children}
    </div>
  )
}
