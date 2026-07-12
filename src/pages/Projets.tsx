import { useState } from 'react'
import { Radar, Sparkles, AlertCircle, Compass } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { Skeleton } from '@/components/ui/Loader'
import { MarkdownBubble } from '@/components/chat/MarkdownBubble'
import { ProjectRadarCard } from '@/components/radar/ProjectRadarCard'
import { useRadar } from '@/lib/radar'
import { fetchFocusDuJour } from '@/lib/focus'
import { logger } from '@/lib/utils'

export function Projets() {
  const { projects, isLoading, error } = useRadar()

  const [focusText, setFocusText] = useState<string | null>(null)
  const [focusLoading, setFocusLoading] = useState(false)
  const [focusError, setFocusError] = useState<string | null>(null)

  async function handleFocus() {
    if (focusLoading || projects.length === 0) return
    setFocusError(null)
    setFocusLoading(true)
    setFocusText(null)
    try {
      const text = await fetchFocusDuJour(projects)
      setFocusText(text)
    } catch (err) {
      logger.error('focus du jour failed', err)
      setFocusError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setFocusLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="col-scroll px-6 py-6 max-w-[1400px] mx-auto w-full">
        {/* Barre de titre + bouton Focus du jour */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-sage">
              <Radar className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-cream-50 leading-tight">Radar Projets</h2>
              <span className="eyebrow">
                Projets en cours · {projects.length} actif{projects.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <GlassButton
            variant="sage"
            onClick={() => void handleFocus()}
            loading={focusLoading}
            disabled={projects.length === 0}
          >
            <Compass className="h-4 w-4" />
            Focus du jour
          </GlassButton>
        </div>

        {/* Encart Focus du jour */}
        {(focusLoading || focusText || focusError) && (
          <GlassCard depth="l3" tone="sage" className="p-4 mb-6" hoverable={false}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-sage" />
              <span className="eyebrow">Focus du jour · 3 priorités</span>
            </div>
            {focusLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {focusError && (
              <div className="flex items-start gap-2 text-xs text-terracotta-light">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{focusError}</span>
              </div>
            )}
            {focusText && !focusLoading && (
              <div className="text-sm text-cream-50">
                <MarkdownBubble text={focusText} />
              </div>
            )}
          </GlassCard>
        )}

        {/* États de chargement / erreur / vide */}
        {isLoading && (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(420px,1fr))]">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        )}

        {!isLoading && error && (
          <GlassCard depth="l3" tone="terracotta" className="p-5" hoverable={false}>
            <div className="flex items-start gap-2 text-sm text-terracotta-light">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Impossible de charger le Radar depuis Airtable.</p>
                <p className="text-xs text-muted mt-1">{error.message}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <GlassCard depth="l3" tone="neutral" className="p-8 text-center" hoverable={false}>
            <div className="flex flex-col items-center gap-2">
              <Radar className="h-8 w-8 text-muted-deeper" />
              <p className="text-sm text-muted">Aucun projet « En cours » pour le moment.</p>
              <p className="text-xs text-muted-deeper">
                Passe un projet au statut « 🏗️ En cours » dans Airtable pour le voir ici.
              </p>
            </div>
          </GlassCard>
        )}

        {!isLoading && !error && projects.length > 0 && (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(420px,1fr))]">
            {projects.map((p) => (
              <ProjectRadarCard key={p.id} project={p} />
            ))}
          </div>
        )}

        {/* Indice silencieux si un badge Bloqué est présent */}
        {!isLoading && !error && projects.some((p) => p.isBlocked) && (
          <p className="text-eyebrow text-muted-deeper mt-5 px-1">
            <GlassBadge tone="terracotta" className="mr-1.5">Bloqué</GlassBadge>
            = tâche cochée « Bloquant » ou ouverte depuis plus de 7 jours.
          </p>
        )}
      </div>
    </AppShell>
  )
}
