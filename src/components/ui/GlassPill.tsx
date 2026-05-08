import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'sage' | 'glacier' | 'terracotta' | 'neutral'

type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone
  pulse?: boolean
  children?: ReactNode
}

const toneStyle: Record<Tone, { dot: string; border: string; glow: string }> = {
  sage: {
    dot: 'bg-sage shadow-[0_0_8px_rgba(125,211,160,0.8)]',
    border: 'border-sage/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(125,211,160,0.5)]',
  },
  glacier: {
    dot: 'bg-glacier shadow-[0_0_8px_rgba(165,216,230,0.8)]',
    border: 'border-glacier/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(165,216,230,0.5)]',
  },
  terracotta: {
    dot: 'bg-terracotta shadow-[0_0_8px_rgba(232,148,106,0.8)]',
    border: 'border-terracotta/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(232,148,106,0.5)]',
  },
  neutral: {
    dot: 'bg-cream-50/60',
    border: 'border-glass-16',
    glow: '',
  },
}

export function GlassPill({
  tone = 'sage',
  pulse = false,
  className,
  children,
  ...rest
}: Props) {
  const t = toneStyle[tone]
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-glass',
        'bg-glass-7 border text-sm text-cream-50',
        t.border,
        t.glow,
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          t.dot,
          pulse && 'animate-pill-pulse',
        )}
      />
      {children}
    </div>
  )
}
