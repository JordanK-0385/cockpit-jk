import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'sage' | 'glacier' | 'terracotta' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children?: ReactNode
}

const variants: Record<Variant, string> = {
  sage:
    'bg-sage/15 hover:bg-sage/25 border-sage/30 text-cream-50 shadow-[0_0_24px_-6px_rgba(125,211,160,0.5)]',
  glacier:
    'bg-glacier/15 hover:bg-glacier/25 border-glacier/30 text-cream-50 shadow-[0_0_24px_-6px_rgba(165,216,230,0.5)]',
  terracotta:
    'bg-terracotta/15 hover:bg-terracotta/25 border-terracotta/30 text-cream-50 shadow-[0_0_24px_-6px_rgba(232,148,106,0.5)]',
  ghost:
    'bg-glass-7 hover:bg-glass-10 border-glass-10 text-cream-50',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-2xl',
}

export function GlassButton({
  variant = 'sage',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-medium',
        'transition-all duration-300 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-deepest',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="h-3 w-3 rounded-full border-2 border-cream-50/50 border-t-cream-50 animate-spin" />
      )}
      {children}
    </button>
  )
}
