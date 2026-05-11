import { useEffect, useState } from 'react'

/**
 * Returns true after `delayMs` of no user activity (mousemove / scroll / keydown /
 * pointerdown / touchstart). Resets immediately on any new event.
 *
 * Used by the ambient layer to freeze animations after 30s of inactivity.
 */
export function useIdleDetection(delayMs = 30_000): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: number | undefined

    const reset = () => {
      setIdle((wasIdle) => (wasIdle ? false : wasIdle))
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), delayMs)
    }

    // Start the countdown on mount.
    reset()

    // Passive listeners so we never block scroll/touch handling.
    const opts: AddEventListenerOptions = { passive: true }
    window.addEventListener('mousemove', reset, opts)
    window.addEventListener('scroll', reset, opts)
    window.addEventListener('pointerdown', reset, opts)
    window.addEventListener('touchstart', reset, opts)
    window.addEventListener('keydown', reset)

    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('scroll', reset)
      window.removeEventListener('pointerdown', reset)
      window.removeEventListener('touchstart', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [delayMs])

  return idle
}
