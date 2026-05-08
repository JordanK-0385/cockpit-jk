import { memo } from 'react'

function GrainBase() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.6] mix-blend-overlay"
      aria-hidden="true"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '3px 3px',
      }}
    />
  )
}

export const Grain = memo(GrainBase)
