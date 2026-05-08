import { memo } from 'react'

function AmbientOrbsBase() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* sage — top right */}
      <div
        className="absolute -top-[15%] -right-[10%] h-[55vmax] w-[55vmax] rounded-full animate-orb-1 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle at center, rgba(125,211,160,0.32) 0%, rgba(125,211,160,0.08) 35%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />
      {/* glacier — bottom left */}
      <div
        className="absolute -bottom-[20%] -left-[10%] h-[60vmax] w-[60vmax] rounded-full animate-orb-2 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle at center, rgba(165,216,230,0.28) 0%, rgba(165,216,230,0.06) 38%, transparent 72%)',
          filter: 'blur(56px)',
        }}
      />
      {/* gold — center */}
      <div
        className="absolute top-[35%] left-[40%] h-[40vmax] w-[40vmax] rounded-full animate-orb-3 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle at center, rgba(240,184,148,0.18) 0%, rgba(240,184,148,0.04) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      {/* sage light — mid right */}
      <div
        className="absolute top-[25%] right-[20%] h-[35vmax] w-[35vmax] rounded-full animate-orb-4 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle at center, rgba(168,230,188,0.22) 0%, rgba(168,230,188,0.05) 40%, transparent 72%)',
          filter: 'blur(52px)',
        }}
      />
    </div>
  )
}

export const AmbientOrbs = memo(AmbientOrbsBase)
