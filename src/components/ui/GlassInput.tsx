import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = InputHTMLAttributes<HTMLInputElement>

export const GlassInput = forwardRef<HTMLInputElement, Props>(
  ({ className, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl',
          'bg-glass-7 border border-glass-10',
          'text-cream-50 placeholder:text-muted-deeper',
          'focus:outline-none focus:border-sage/40 focus:bg-glass-10',
          'transition-colors duration-200',
          className,
        )}
        {...rest}
      />
    )
  },
)
GlassInput.displayName = 'GlassInput'
