import { useEffect, useState } from 'react'

/**
 * Returns whether the document is currently visible (Page Visibility API).
 * Used by the ambient layer to stop rendering when the tab is in the
 * background — saves ~30% GPU on idle Mac M1/M2.
 */
export function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState<boolean>(
    typeof document === 'undefined' ? true : !document.hidden,
  )

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
