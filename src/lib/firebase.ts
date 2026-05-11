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
import { getFirestore, type Firestore } from 'firebase/firestore'

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
let db: Firestore | null = null

function ensureApp(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Firebase config is missing. Did you set VITE_FIREBASE_* in .env.local?',
    )
  }
  if (!app) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
  }
  return { app: app!, auth: auth!, db: db! }
}

export function getDb(): Firestore {
  return ensureApp().db
}

const provider = new GoogleAuthProvider()
// Calendar scope intentionally NOT requested at login.
//
// When the GoogleAuthProvider includes a non-default OAuth scope, Firebase
// Auth attaches the resulting access token to the user session and the
// cross-origin auth iframe (cockpit-jk.firebaseapp.com, running as an OOPIF)
// starts polling Google's token endpoint to keep that access token fresh —
// even when no Calendar call is ever made. On Jordan's machine this iframe
// process was burning ~57% CPU + 41% GPU continuously.
//
// Sprint 4 will re-request the Calendar scope on demand via
// `linkWithPopup(user, calendarProvider)` (or `reauthenticateWithPopup`)
// right before the first Calendar read/write — that flow only refreshes
// the access token when the app actually uses it.
//
// Scopes left to defaults (email + profile, granted automatically).
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
