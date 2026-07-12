import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Local-dev fallback for `vercel dev`.
 *
 * Vercel CLI 53.x's `vercel dev` does NOT inject `.env.local` into
 * serverless function processes when the project is linked to a cloud
 * project whose environment variables are empty. The functions spawn
 * with only the parent shell's env, which leaves things like
 * FIREBASE_SERVICE_ACCOUNT_JSON / ANTHROPIC_API_KEY / AIRTABLE_PAT
 * undefined and every /api/* route 401s.
 *
 * This block reads `.env.local` from cwd once at module load and fills
 * in any vars missing from process.env. It's a no-op in production
 * (Vercel injects project env vars directly), and never overwrites an
 * existing value — so cloud env still wins when populated.
 *
 * Remove once Vercel CLI's dev-server is back to honoring `.env.local`
 * (or once this project's cloud env is populated).
 */
function loadLocalEnvFallback(): void {
  if (process.env.VERCEL_ENV === 'production') return
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) return
    let loaded = 0
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      if (!line || line.startsWith('#')) continue
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2]
        loaded++
      }
    }
    if (loaded > 0) {
      // eslint-disable-next-line no-console
      console.log(`[auth] Loaded ${loaded} vars from .env.local (vercel dev fallback)`)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] Could not load .env.local fallback:', err)
  }
}

loadLocalEnvFallback()

let adminApp: App | null = null

export function getAdmin(): App {
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
