import { memo } from 'react'
import { AmbientOrbs } from './AmbientOrbs'
import { Bokeh } from './Bokeh'
import { Particles } from './Particles'
import { Grain } from './Grain'

function AmbientLayerBase() {
  return (
    <div className="fixed inset-0 -z-0 pointer-events-none">
      <AmbientOrbs />
      <Bokeh />
      <Particles />
      <Grain />
    </div>
  )
}

export const AmbientLayer = memo(AmbientLayerBase)
