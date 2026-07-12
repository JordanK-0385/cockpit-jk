import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertCircle, ExternalLink, LogOut, Plus, PlayCircle, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { Skeleton } from '@/components/ui/Loader'
import { ClientCard } from '@/components/accueil/ClientCard'
import { useBoard } from '@/lib/board'
import { useAssistant } from '@/components/assistant/AssistantProvider'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Bonne nuit'
  if (h < 18) return 'Bonjour'
  return 'Bonsoir'
}

export function Accueil() {
  const { clients, resume, isLoading, error } = useBoard()
  const { open } = useAssistant()
  const dateLabel = format(new Date(), 'EEEE d MMMM', { locale: fr })

  return (
    <AppShell>
      <div className="col-scroll px-6 py-6 max-w-[1300px] mx-auto w-full">
        {/* 1. Bandeau « Aujourd'hui » */}
        <div className="grid gap-4 md:grid-cols-[1fr_auto] mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-cream-50 leading-tight">
              {greeting()}, Jordan
            </h1>
            <span className="eyebrow capitalize">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <GlassBadge tone="sage" className="gap-1.5">
              <PlayCircle className="h-3.5 w-3.5" />
              Journée en cours
            </GlassBadge>
            <button
              type="button"
              disabled
              title="Check-out à brancher (Sprint suivant)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-glass-7 border border-glass-10 text-xs text-muted-deeper opacity-50 cursor-not-allowed"
            >
              <LogOut className="h-3.5 w-3.5" />
              Clôturer ma journée
            </button>
          </div>
        </div>

        {/* Reprendre là où tu t'es arrêté */}
        {resume && (
          <GlassCard depth="l3" tone="glacier" className="p-4 mb-6" hoverable={false}>
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-glacier shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="eyebrow">Reprendre là où tu t'es arrêté · {resume.type}</span>
                {resume.summary && (
                  <p className="text-sm text-cream-50 leading-snug mt-1 line-clamp-2">
                    {resume.summary}
                  </p>
                )}
              </div>
              {resume.url && (
                <a
                  href={resume.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glacier/15 hover:bg-glacier/25 border border-glacier/30 text-xs text-glacier-light transition-colors shrink-0"
                >
                  Reprendre
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </GlassCard>
        )}

        {/* 2. Board */}
        {isLoading && (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        )}

        {!isLoading && error && (
          <GlassCard depth="l3" tone="terracotta" className="p-5" hoverable={false}>
            <div className="flex items-start gap-2 text-sm text-terracotta-light">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Impossible de charger le board depuis Airtable.</p>
                <p className="text-xs text-muted mt-1">{error.message}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {!isLoading && !error && (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
            {clients.map((c) => (
              <ClientCard key={c.client} client={c} />
            ))}

            {/* Carte fantôme « Nouveau client/projet » */}
            <button
              type="button"
              onClick={() => open()}
              className="min-h-[16rem] rounded-2xl border-2 border-dashed border-glass-16 text-muted-deeper hover:text-cream-50 hover:border-glass-10 hover:bg-glass-7 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm">Nouveau client / projet</span>
            </button>
          </div>
        )}

        {!isLoading && !error && clients.length === 0 && (
          <p className="text-xs text-muted-deeper mt-4 px-1">
            Aucun client actif pour le moment — passe un projet en « En cours » dans Airtable.
          </p>
        )}
      </div>
    </AppShell>
  )
}
