import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'sage' | 'glacier' | 'terracotta' | 'neutral'

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone
  children?: ReactNode
}

const toneClasses: Record<Tone, string> = {
  sage:       'bg-sage/15 border-sage/30 text-sage-light',
  glacier:    'bg-glacier/15 border-glacier/30 text-glacier-light',
  terracotta: 'bg-terracotta/15 border-terracotta/30 text-terracotta-light',
  neutral:    'bg-glass-7 border-glass-10 text-muted',
}

export function GlassBadge({ tone = 'neutral', className, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border tracking-wide',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
