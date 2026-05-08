import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App | null = null

function getAdmin(): App {
  if (adminApp) return adminApp
  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!json) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set')
  }
  const serviceAccount = JSON.parse(json)
  adminApp = initializeApp({ credential: cert(serviceAccount) })
  return adminApp
}

const AUTHORIZED_EMAIL = process.env.AUTHORIZED_EMAIL

/**
 * Verifies the Firebase ID token in the Authorization header AND that the
 * authenticated email matches AUTHORIZED_EMAIL. Returns the decoded token,
 * or sends a 401 and returns null.
 */
export async function requireAuthorizedUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ uid: string; email: string } | null> {
  const header = req.headers['authorization']
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization Bearer token' })
    return null
  }
  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    res.status(401).json({ error: 'Empty token' })
    return null
  }

  try {
    const admin = getAdmin()
    const decoded = await getAuth(admin).verifyIdToken(token)
    const email = decoded.email
    if (!email) {
      res.status(401).json({ error: 'Token has no email' })
      return null
    }
    if (AUTHORIZED_EMAIL && email !== AUTHORIZED_EMAIL) {
      res.status(403).json({ error: 'Forbidden — unauthorized email' })
      return null
    }
    return { uid: decoded.uid, email }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', detail: String(err) })
    return null
  }
}

export function setNoStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
}
