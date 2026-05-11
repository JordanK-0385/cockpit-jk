import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDb } from './firebase'
import { useAuth } from './auth'
import { logger } from './utils'

export type Preferences = {
  performanceMode: boolean
}

const DEFAULTS: Preferences = {
  performanceMode: false,
}

type Ctx = {
  prefs: Preferences
  /** True only because the OS pref says so. The user toggle wins over this. */
  reducedMotion: boolean
  /** Effective performance mode = user toggle OR reduced-motion. */
  effectivePerformanceMode: boolean
  setPerformanceMode: (next: boolean) => Promise<void>
  loaded: boolean
}

const PreferencesContext = createContext<Ctx>({
  prefs: DEFAULTS,
  reducedMotion: false,
  effectivePerformanceMode: false,
  setPerformanceMode: async () => {},
  loaded: false,
})

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches)
    // Safari < 14 only has addListener; modern browsers prefer addEventListener
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  return reduce
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  // Load preferences from Firestore when the user authenticates.
  useEffect(() => {
    let cancelled = false
    if (!user) {
      setPrefs(DEFAULTS)
      setLoaded(true)
      return () => {
        cancelled = true
      }
    }
    ;(async () => {
      try {
        const ref = doc(getDb(), 'users', user.uid, 'preferences', 'ui')
        const snap = await getDoc(ref)
        if (cancelled) return
        if (snap.exists()) {
          const data = snap.data() as Partial<Preferences>
          setPrefs({ ...DEFAULTS, ...data })
        } else {
          setPrefs(DEFAULTS)
        }
      } catch (err) {
        logger.warn('Failed to load preferences', err)
        setPrefs(DEFAULTS)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const setPerformanceMode = useCallback(
    async (next: boolean) => {
      setPrefs((p) => ({ ...p, performanceMode: next }))
      if (!user) return
      try {
        const ref = doc(getDb(), 'users', user.uid, 'preferences', 'ui')
        await setDoc(ref, { performanceMode: next }, { merge: true })
      } catch (err) {
        logger.warn('Failed to persist performanceMode', err)
      }
    },
    [user],
  )

  // Apply or remove the .perf-mode class on <html>.
  const effective = prefs.performanceMode || reducedMotion
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('perf-mode', effective)
  }, [effective])

  const value = useMemo<Ctx>(
    () => ({
      prefs,
      reducedMotion,
      effectivePerformanceMode: effective,
      setPerformanceMode,
      loaded,
    }),
    [prefs, reducedMotion, effective, setPerformanceMode, loaded],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): Ctx {
  return useContext(PreferencesContext)
}

/** Convenience hook for ambient components and the toggle. */
export function usePerformanceMode(): boolean {
  return useContext(PreferencesContext).effectivePerformanceMode
}
