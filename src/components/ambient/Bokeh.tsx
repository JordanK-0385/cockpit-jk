import { memo } from 'react'

const POINTS = [
  { top: '12%', left: '18%', size: 6, delay: '0s',   tint: 'rgba(168,230,188,0.65)' },
  { top: '28%', left: '72%', size: 5, delay: '1.4s', tint: 'rgba(165,216,230,0.55)' },
  { top: '58%', left: '36%', size: 7, delay: '2.6s', tint: 'rgba(240,184,148,0.50)' },
  { top: '74%', left: '82%', size: 5, delay: '0.8s', tint: 'rgba(168,230,188,0.55)' },
  { top: '46%', left: '8%',  size: 6, delay: '3.2s', tint: 'rgba(165,216,230,0.45)' },
]

function BokehBase() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {POINTS.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-bokeh-pulse"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.tint,
            boxShadow: `0 0 ${p.size * 4}px ${p.tint}`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

export const Bokeh = memo(BokehBase)
