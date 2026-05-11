import { useEffect, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Sparkles, Cloud, LogOut } from 'lucide-react'
import { GlassPill } from '@/components/ui/GlassPill'
import { PerformanceToggle } from '@/components/PerformanceToggle'
import { logout } from '@/lib/firebase'
import { useAuth } from '@/lib/auth'

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function AppShell({ children }: { children: ReactNode }) {
  const now = useNow(1000)
  const { user } = useAuth()

  const dateLabel = format(now, "EEEE d MMMM", { locale: fr })
  const timeLabel = format(now, 'HH:mm:ss')

  return (
    <div className="min-h-screen w-screen">
      <header className="glass-header sticky top-0 z-30 h-20 w-full px-6 flex items-center justify-between border-b border-glass-10 bg-ink-deepest/40">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-xl blur-lg"
              style={{ background: 'rgba(125,211,160,0.5)' }}
            />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-sage-light to-sage-deep flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-ink-deepest" strokeWidth={2.2} />
            </div>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-muted">Cockpit · Jordan Koskas</span>
            <span className="eyebrow">{dateLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <GlassPill tone="glacier" className="hidden md:inline-flex">
            <Cloud className="h-3.5 w-3.5" />
            <span className="text-xs">Paris · 18°</span>
          </GlassPill>

          <GlassPill tone="sage" pulse>
            <span className="text-xs tabular-nums tracking-wider">{timeLabel}</span>
          </GlassPill>

          <PerformanceToggle />

          <button
            onClick={() => void logout()}
            className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-glass-7 hover:bg-glass-10 border border-glass-10 text-muted hover:text-cream-50 text-xs transition-colors"
            title={user?.email ?? 'Déconnexion'}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {children}
    </div>
  )
}
