import { memo } from 'react'
import { AmbientOrbs } from './AmbientOrbs'
import { Bokeh } from './Bokeh'
import { Particles } from './Particles'
import { Grain } from './Grain'
import { useDocumentVisibility } from '@/lib/hooks/useDocumentVisibility'
import { useIdleDetection } from '@/lib/hooks/useIdleDetection'
import { usePerformanceMode } from '@/lib/preferences'

function AmbientLayerBase() {
  const visible = useDocumentVisibility()
  const idle = useIdleDetection(30_000)
  const perfMode = usePerformanceMode()

  // P2 — Page Visibility: unmount the whole ambient subtree when the tab
  // is backgrounded. ~30% GPU saved on idle Mac.
  if (!visible) return null

  // Performance mode: ambient layer is hidden via CSS (html.perf-mode .ambient-layer { display: none })
  // We could also early-return here, but keeping the element mounted lets the
  // CSS transition cover the toggle and avoids re-mount cost when toggled rapidly.
  if (perfMode) return null

  return (
    <div
      className={`ambient-layer fixed inset-0 -z-0 pointer-events-none ${idle ? 'paused' : ''}`}
      data-paused={idle ? 'true' : 'false'}
    >
      <AmbientOrbs />
      <Bokeh />
      <Particles />
      <Grain />
    </div>
  )
}

export const AmbientLayer = memo(AmbientLayerBase)
