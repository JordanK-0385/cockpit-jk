import { useState } from 'react'
import { Sparkles, ShieldCheck } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassPill } from '@/components/ui/GlassPill'
import { loginWithGoogle, AUTHORIZED_EMAIL } from '@/lib/firebase'
import { logger } from '@/lib/utils'

export function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (e) {
      logger.error(e)
      setError(e instanceof Error ? e.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <GlassCard
        depth="l1"
        tone="sage"
        hoverable={false}
        className="w-full max-w-md p-10"
      >
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Sparkle logo — static box-shadow replaces the previous
              filter:blur(40px) halo (filter:blur is a separate
              compositor layer that runs every paint frame). */}
          <div
            className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sage-light to-sage-deep flex items-center justify-center"
            style={{ boxShadow: '0 0 30px rgba(125, 211, 160, 0.4)' }}
          >
            <Sparkles className="h-7 w-7 text-ink-deepest" strokeWidth={2} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium tracking-tight">Cockpit JK</h1>
            <p className="text-sm text-muted">
              Station de commande · Jordan Koskas
            </p>
          </div>

          <GlassPill tone="sage">
            <span className="text-xs">Accès restreint</span>
          </GlassPill>

          <div className="w-full pt-2">
            <GlassButton
              variant="sage"
              size="lg"
              loading={loading}
              onClick={handleLogin}
              className="w-full"
            >
              <GoogleGlyph />
              Se connecter avec Google
            </GlassButton>
          </div>

          {error && (
            <div className="text-sm text-terracotta-light bg-terracotta/10 border border-terracotta/30 rounded-xl px-4 py-3 w-full">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-deeper pt-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Réservé à {AUTHORIZED_EMAIL}</span>
          </div>
        </div>
      </GlassCard>
    </main>
  )
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.67-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
