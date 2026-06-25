import { useEffect, useState } from 'react'
import { GraduationCap, AlertCircle, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { Skeleton } from '@/components/ui/Loader'
import { SubjectPicker } from '@/components/apprendre/SubjectPicker'
import { QuizRunner } from '@/components/apprendre/QuizRunner'
import { ScorePanel } from '@/components/apprendre/ScorePanel'
import { useSujets, type Sujet } from '@/lib/apprentissage'
import { generateQuiz, type QuizQuestion } from '@/lib/quiz'
import { saveAttempt, loadAttempts } from '@/lib/quiz-store'
import { pct, type QuizAttempt } from '@/lib/quiz-stats'
import { useAuth } from '@/lib/auth'
import { logger } from '@/lib/utils'

type View = 'picker' | 'quiz'

export function Apprendre() {
  const { user } = useAuth()
  const { sujets, isLoading, error } = useSujets()

  const [view, setView] = useState<View>('picker')
  const [selected, setSelected] = useState<Sujet | null>(null)
  const [niveau, setNiveau] = useState<string>('Intermédiaire')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Charge l'historique des scores une fois l'utilisateur connu.
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
      const qs = await generateQuiz({ sujet: selected.theme, niveau, angle: selected.angle })
      setQuestions(qs)
      setSaved(false)
      setView('quiz')
    } catch (err) {
      logger.error('generate quiz failed', err)
      setGenError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setGenLoading(false)
    }
  }

  async function handleSave(score: number, trace: string) {
    if (!user || !selected || saving) return
    setSaving(true)
    const total = questions.length
    const attempt = {
      sujetId: selected.id,
      sujet: selected.theme,
      niveau,
      score,
      total,
      pct: pct(score, total),
      trace,
    }
    try {
      await saveAttempt(user.uid, attempt)
      setSaved(true)
      // Recharge l'historique pour refléter la nouvelle session.
      const fresh = await loadAttempts(user.uid)
      setAttempts(fresh)
    } catch (err) {
      logger.error('save attempt failed', err)
      setGenError(err instanceof Error ? err.message : 'Sauvegarde impossible')
    } finally {
      setSaving(false)
    }
  }

  function exitToPicker() {
    setView('picker')
    setQuestions([])
    setSaved(false)
  }

  return (
    <AppShell>
      <div className="col-scroll px-6 py-6 max-w-[1400px] mx-auto w-full">
        {/* Titre */}
        <div className="flex items-center gap-2.5 mb-5">
          <span className="text-sage">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-cream-50 leading-tight">Apprendre</h2>
            <span className="eyebrow">Entraînement quotidien · {sujets.length} sujet{sujets.length > 1 ? 's' : ''} actif{sujets.length > 1 ? 's' : ''}</span>
          </div>
        </div>

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
                    <p className="text-sm text-muted">Aucun sujet « Actif » dans la table Sujets d'apprentissage.</p>
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

            {view === 'quiz' && selected && (
              <QuizRunner
                questions={questions}
                sujet={selected.theme}
                onSave={(score, trace) => void handleSave(score, trace)}
                onReplay={() => void startQuiz()}
                onExit={exitToPicker}
                saving={saving}
                saved={saved}
              />
            )}
          </div>

          {/* Colonne progression */}
          <ScorePanel attempts={attempts} loading={attemptsLoading} />
        </div>
      </div>
    </AppShell>
  )
}
