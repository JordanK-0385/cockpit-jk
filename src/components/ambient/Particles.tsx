import { memo } from 'react'

const N = 8

function ParticlesBase() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: N }).map((_, i) => {
        const left = `${(i * 12.5 + 4) % 100}%`
        const duration = `${16 + (i % 4) * 1.5}s`
        const delay = `${(i * 1.7) % 8}s`
        const size = 2 + (i % 3)
        return (
          <span
            key={i}
            className="particle absolute bottom-[-10vh] rounded-full animate-particle-rise"
            style={{
              left,
              width: size,
              height: size,
              background: 'rgba(244,240,232,0.5)',
              boxShadow: '0 0 8px rgba(168,230,188,0.5)',
              animationDuration: duration,
              animationDelay: delay,
            }}
          />
        )
      })}
    </div>
  )
}

export const Particles = memo(ParticlesBase)
