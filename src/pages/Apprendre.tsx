import { useEffect, useState } from 'react'
import { GraduationCap, AlertCircle, Sparkles, Dumbbell, Library } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { Skeleton } from '@/components/ui/Loader'
import { SubjectPicker } from '@/components/apprendre/SubjectPicker'
import { QuizRunner } from '@/components/apprendre/QuizRunner'
import { ScorePanel } from '@/components/apprendre/ScorePanel'
import { FichesView } from '@/components/apprendre/FichesView'
import { useSujets, type Sujet } from '@/lib/apprentissage'
import { generateQuiz, type QuizPayload } from '@/lib/quiz'
import { saveAttempt, loadAttempts } from '@/lib/quiz-store'
import { createFiche } from '@/lib/fiches'
import { useFiches } from '@/lib/fiches'
import { pct, type QuizAttempt } from '@/lib/quiz-stats'
import { useAuth } from '@/lib/auth'
import { cn, logger } from '@/lib/utils'

type View = 'picker' | 'quiz'
type Tab = 'train' | 'fiches'

export function Apprendre() {
  const { user } = useAuth()
  const { sujets, isLoading, error } = useSujets()
  const { fiches, isLoading: fichesLoading, error: fichesError, refetch: refetchFiches } = useFiches()

  const [tab, setTab] = useState<Tab>('train')
  const [view, setView] = useState<View>('picker')
  const [selected, setSelected] = useState<Sujet | null>(null)
  const [niveau, setNiveau] = useState<string>('Intermédiaire')
  const [payload, setPayload] = useState<QuizPayload | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setAttemptsLoading(true)
    loadAttempts(user.uid)
      .then((a) => {
        if (!cancelled) setAttempts(a)
      })
      .catch((err) => logger.error('load attempts failed', err))
      .finally(() => {
        if (!cancelled) setAttemptsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  function pickSujet(s: Sujet) {
    setSelected(s)
    setNiveau(s.niveau || 'Intermédiaire')
  }

  async function startQuiz() {
    if (!selected || genLoading) return
    setGenError(null)
    setGenLoading(true)
    try {
      const p = await generateQuiz({ sujet: selected.theme, niveau, angle: selected.angle })
      setPayload(p)
      setSaved(false)
      setSaveError(null)
      setSaveWarning(null)
      setView('quiz')
    } catch (err) {
      logger.error('generate quiz failed', err)
      setGenError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setGenLoading(false)
    }
  }

  async function handleSave(score: number, trace: string) {
    if (!user || !selected || !payload || saving) return
    setSaving(true)
    setSaveError(null)
    setSaveWarning(null)
    const total = payload.questions.length
    const percentage = pct(score, total)

    // Fiche Airtable (révision durable) — c'est le livrable principal.
    let ficheOk = false
    try {
      await createFiche({
        sujet: selected.theme,
        domaine: selected.domaine,
        niveau,
        score,
        total,
        pct: percentage,
        enseignements: payload.enseignements,
        glossaire: payload.glossaire,
        trace,
      })
      ficheOk = true
    } catch (err) {
      logger.error('create fiche failed', err)
      setSaveError(err instanceof Error ? err.message : 'Enregistrement de la fiche impossible')
    }

    // Score Firestore (progression) — best-effort : nécessite les règles
    // déployées. Un échec ici ne doit pas masquer la fiche enregistrée.
    try {
      await saveAttempt(user.uid, {
        sujetId: selected.id,
        sujet: selected.theme,
        niveau,
        score,
        total,
        pct: percentage,
        trace,
      })
      const fresh = await loadAttempts(user.uid)
      setAttempts(fresh)
    } catch (err) {
      logger.error('save attempt failed', err)
      if (ficheOk) {
        setSaveWarning(
          'Fiche enregistrée, mais la progression (scores) n’a pas pu être sauvée : déploie les règles Firestore (firebase deploy --only firestore:rules).',
        )
      }
    }

    if (ficheOk) {
      setSaved(true)
      void refetchFiches()
    }
    setSaving(false)
  }

  function exitToPicker() {
    setView('picker')
    setPayload(null)
    setSaved(false)
    setSaveError(null)
    setSaveWarning(null)
  }

  const tabs: { id: Tab; label: string; icon: typeof Dumbbell }[] = [
    { id: 'train', label: "S'entraîner", icon: Dumbbell },
    { id: 'fiches', label: 'Mes fiches', icon: Library },
  ]

  return (
    <AppShell>
      <div className="col-scroll px-6 py-6 max-w-[1400px] mx-auto w-full">
        {/* Titre + onglets internes */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-sage">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-cream-50 leading-tight">Apprendre</h2>
              <span className="eyebrow">
                Entraînement quotidien · {sujets.length} sujet{sujets.length > 1 ? 's' : ''} actif
                {sujets.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors',
                  tab === t.id
                    ? 'bg-sage/15 border-sage/30 text-sage-light'
                    : 'bg-glass-7 border-glass-10 text-muted hover:text-cream-50',
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'fiches' ? (
          <FichesView fiches={fiches} loading={fichesLoading} error={fichesError} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              {view === 'picker' && (
                <>
                  {isLoading && (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-1/3" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                    </div>
                  )}

                  {!isLoading && error && (
                    <GlassCard depth="l3" tone="terracotta" className="p-5" hoverable={false}>
                      <div className="flex items-start gap-2 text-sm text-terracotta-light">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Impossible de charger les sujets depuis Airtable.</p>
                          <p className="text-xs text-muted mt-1">{error.message}</p>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {!isLoading && !error && sujets.length === 0 && (
                    <GlassCard depth="l3" tone="neutral" className="p-8 text-center" hoverable={false}>
                      <p className="text-sm text-muted">
                        Aucun sujet « Actif » dans la table Sujets d'apprentissage.
                      </p>
                    </GlassCard>
                  )}

                  {!isLoading && !error && sujets.length > 0 && (
                    <div className="space-y-5">
                      <SubjectPicker
                        sujets={sujets}
                        selectedId={selected?.id ?? null}
                        niveau={niveau}
                        onSelect={pickSujet}
                        onNiveau={setNiveau}
                      />

                      {genError && (
                        <div className="flex items-start gap-2 text-xs text-terracotta-light">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{genError}</span>
                        </div>
                      )}

                      <div className="sticky bottom-4">
                        <GlassButton
                          variant="sage"
                          size="lg"
                          onClick={() => void startQuiz()}
                          loading={genLoading}
                          disabled={!selected}
                        >
                          <Sparkles className="h-4 w-4" />
                          {selected ? `Démarrer · ${selected.theme}` : 'Choisis un sujet'}
                        </GlassButton>
                      </div>
                    </div>
                  )}
                </>
              )}

              {view === 'quiz' && selected && payload && (
                <QuizRunner
                  questions={payload.questions}
                  glossaire={payload.glossaire}
                  enseignements={payload.enseignements}
                  sujet={selected.theme}
                  onSave={(score, trace) => void handleSave(score, trace)}
                  onReplay={() => void startQuiz()}
                  onExit={exitToPicker}
                  saving={saving}
                  saved={saved}
                  saveError={saveError}
                  saveWarning={saveWarning}
                />
              )}
            </div>

            <ScorePanel attempts={attempts} loading={attemptsLoading} />
          </div>
        )}
      </div>
    </AppShell>
  )
}
