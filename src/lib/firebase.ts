import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

function ensureApp(): { app: FirebaseApp; auth: Auth } {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Firebase config is missing. Did you set VITE_FIREBASE_* in .env.local?',
    )
  }
  if (!app) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
  }
  return { app: app!, auth: auth! }
}

const provider = new GoogleAuthProvider()
const calendarScope = import.meta.env.VITE_GOOGLE_CALENDAR_SCOPE
if (calendarScope) {
  provider.addScope(calendarScope)
}
provider.setCustomParameters({ prompt: 'select_account' })

export const AUTHORIZED_EMAIL = import.meta.env.VITE_AUTHORIZED_EMAIL

export async function loginWithGoogle(): Promise<User> {
  const { auth } = ensureApp()
  const result = await signInWithPopup(auth, provider)
  if (result.user.email !== AUTHORIZED_EMAIL) {
    await signOut(auth)
    throw new Error(`Accès refusé : ${result.user.email}`)
  }
  return result.user
}

export async function logout(): Promise<void> {
  const { auth } = ensureApp()
  await signOut(auth)
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  const { auth } = ensureApp()
  return onAuthStateChanged(auth, cb)
}

export async function getIdToken(): Promise<string | null> {
  const { auth } = ensureApp()
  const u = auth.currentUser
  if (!u) return null
  return await u.getIdToken()
}
