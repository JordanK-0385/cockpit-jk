import { memo, useEffect, useState } from 'react'
import { format } from 'date-fns'

/**
 * Isolated 1Hz clock — owns its own state so the parent (AppShell) is
 * NOT re-rendered every second. Before this extraction, AppShell held
 * the interval and cascaded a re-render through the whole Cockpit tree
 * (~80-100 components) once per second. memo'd because the component
 * has no props and never needs reconciliation from above.
 */
export const LiveClock = memo(function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span className="text-xs tabular-nums tracking-wider">
      {format(now, 'HH:mm:ss')}
    </span>
  )
})
