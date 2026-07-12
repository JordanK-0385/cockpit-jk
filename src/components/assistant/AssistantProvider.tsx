import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AssistantDrawer } from './AssistantDrawer'

export type AssistantContextValue = { client?: string }

type AssistantApi = {
  isOpen: boolean
  context: AssistantContextValue | null
  open: (ctx?: AssistantContextValue) => void
  close: () => void
}

const AssistantCtx = createContext<AssistantApi | null>(null)

/**
 * Fournit l'Assistant (chat en slide-over) à toute l'app. Monté au-dessus des
 * routes : n'importe quelle carte peut appeler `useAssistant().open({ client })`
 * pour ouvrir le panneau préchargé du contexte client. Raccourci ⌘K / Ctrl+K.
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<AssistantContextValue | null>(null)

  const open = useCallback((ctx?: AssistantContextValue) => {
    setContext(ctx ?? null)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])

  // ⌘K / Ctrl+K : bascule le panneau (sans contexte client particulier).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const api = useMemo<AssistantApi>(
    () => ({ isOpen, context, open, close }),
    [isOpen, context, open, close],
  )

  return (
    <AssistantCtx.Provider value={api}>
      {children}
      <AssistantDrawer isOpen={isOpen} context={context} onClose={close} />
    </AssistantCtx.Provider>
  )
}

export function useAssistant(): AssistantApi {
  const ctx = useContext(AssistantCtx)
  if (!ctx) throw new Error('useAssistant doit être utilisé dans <AssistantProvider>')
  return ctx
}
