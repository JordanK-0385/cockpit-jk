import { memo } from 'react'

/**
 * Disabled by default — Level A++ aggressive performance cut.
 *
 * All background animations (orbs / bokeh / particles / animated grain)
 * were costing >40% GPU + >70% CPU on Jordan's M1. They are now off
 * across the whole app. The original implementation lives in:
 *   - ./AmbientOrbs.tsx
 *   - ./Bokeh.tsx
 *   - ./Particles.tsx
 *   - ./Grain.tsx
 *
 * To re-enable, import them and render inside the fragment below.
 * The grain dot pattern is now a static body background-image
 * (see globals.css :: body) — no need to re-import Grain for that.
 *
 * Hooks for visibility / idle / perf-mode are intentionally removed
 * from here: nothing to gate when nothing renders.
 */
function AmbientLayerBase() {
  return null
}

export const AmbientLayer = memo(AmbientLayerBase)
