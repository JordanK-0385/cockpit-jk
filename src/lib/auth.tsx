import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { watchAuth, AUTHORIZED_EMAIL } from './firebase'

type AuthState = {
  user: User | null
  authorized: boolean
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  authorized: false,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = () => {}
    try {
      unsub = watchAuth((u) => {
        setUser(u)
        setLoading(false)
      })
    } catch {
      // Firebase not configured yet — stay unauthenticated, stop loading.
      setLoading(false)
    }
    return () => unsub()
  }, [])

  const authorized = !!user && user.email === AUTHORIZED_EMAIL

  return (
    <AuthContext.Provider value={{ user, authorized, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
