import { KeyRound } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import type { N8nCredentialExpiry } from '@/lib/n8n-types'

/**
 * Bandeau terracotta listant les credentials proches de l'expiration (lot D).
 * N'apparaît que si au moins une date est renseignée sous le seuil.
 */
export function CredentialsBanner({ credentials }: { credentials: N8nCredentialExpiry[] }) {
  if (credentials.length === 0) return null
  return (
    <GlassCard depth="l3" tone="terracotta" className="p-4" hoverable={false}>
      <div className="flex items-start gap-3">
        <KeyRound className="h-5 w-5 text-terracotta shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-terracotta-light">
            {credentials.length} credential{credentials.length > 1 ? 's' : ''} à renouveler bientôt
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {credentials.map((c) => (
              <GlassBadge key={c.label} tone="terracotta" className="gap-1">
                {c.label}
                <span className="opacity-80">· {c.daysLeft <= 0 ? 'expiré' : `J-${c.daysLeft}`}</span>
              </GlassBadge>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
