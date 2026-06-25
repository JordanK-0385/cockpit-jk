import { type ReactNode } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Sparkles, Cloud, LogOut, LayoutGrid, Radar } from 'lucide-react'
import { GlassPill } from '@/components/ui/GlassPill'
import { LiveClock } from '@/components/LiveClock'
import { PerformanceToggle } from '@/components/PerformanceToggle'
import { logout } from '@/lib/firebase'
import { useAuth } from '@/lib/auth'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const MODULES = [
  { id: 'cockpit', label: 'Cockpit', icon: LayoutGrid, path: '/' },
  { id: 'radar', label: 'Radar Projets', icon: Radar, path: '/radar' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  // Date label is computed once per mount — it doesn't tick. Crossing
  // midnight without a reload will keep yesterday's label, which is an
  // acceptable trade for not re-rendering the entire app every second.
  const dateLabel = format(new Date(), "EEEE d MMMM", { locale: fr })
  const { user } = useAuth()

  return (
    <div className="min-h-screen w-screen">
      <header className="glass-header sticky top-0 z-30 h-20 w-full px-6 flex items-center justify-between border-b border-glass-10 bg-ink-deepest/40">
        <div className="flex items-center gap-4">
          {/* Sparkle logo — static box-shadow replaces the previous
              filter:blur halo (filter:blur is a separate compositor
              layer that runs every paint frame). The shadow is purely
              painted, no GPU shader. */}
          <div
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-sage-light to-sage-deep flex items-center justify-center"
            style={{ boxShadow: '0 0 22px rgba(125, 211, 160, 0.45)' }}
          >
            <Sparkles className="h-5 w-5 text-ink-deepest" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm text-muted">Cockpit · Jordan Koskas</span>
            <span className="eyebrow">{dateLabel}</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1.5">
          {MODULES.map((m) => (
            <NavLink
              key={m.id}
              to={m.path}
              end
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors',
                  isActive
                    ? 'bg-sage/15 border-sage/30 text-sage-light'
                    : 'bg-glass-7 border-glass-10 text-muted hover:text-cream-50',
                )
              }
            >
              <m.icon className="h-3.5 w-3.5" />
              <span>{m.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <GlassPill tone="glacier" className="hidden md:inline-flex">
            <Cloud className="h-3.5 w-3.5" />
            <span className="text-xs">Paris · 18°</span>
          </GlassPill>

          <GlassPill tone="sage">
            <LiveClock />
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
