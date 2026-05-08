import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Depth = 'l1' | 'l2' | 'l3' | 'flat'
type Tone = 'sage' | 'glacier' | 'terracotta' | 'neutral'

type Props = HTMLAttributes<HTMLDivElement> & {
  depth?: Depth
  tone?: Tone
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
  hoverable = true,
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        'glass-base relative overflow-hidden',
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
