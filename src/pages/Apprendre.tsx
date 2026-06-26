import { useEffect, useMemo, useRef, useState } from 'react'
import { GraduationCap, AlertCircle, Map as MapIcon, Library } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/Loader'
import { ParcoursView } from '@/components/apprendre/ParcoursView'
import { QuizRunner } from '@/components/apprendre/QuizRunner'
import { FichesView } from '@/components/apprendre/FichesView'
import { useSujets, type Sujet } from '@/lib/apprentissage'
import { buildParcours, type Niveau } from '@/lib/parcours'
import { generateQuiz, type QuizPayload } from '@/lib/quiz'
import { saveAttempt, loadAttempts } from '@/lib/quiz-store'
import { createFiche, useFiches, type Fiche } from '@/lib/fiches'
import { pct, type QuizAttempt } from '@/lib/quiz-stats'
import { useAuth } from '@/lib/auth'
import { cn, logger } from '@/lib/utils'

type View = 'parcours' | 'quiz'
type Tab = 'parcours' | 'fiches'

export function Apprendre() {
  const { user } = useAuth()
  const { sujets, isLoading, error } = useSujets()
  const { fiches, isLoading: fichesLoading, error: fichesError, refetch: refetchFiches } = useFiches()

  const [tab, setTab] = useState<Tab>('parcours')
  const [view, setView] = useState<View>('parcours')
  const [selected, setSelected] = useState<Sujet | null>(null)
  const [niveau, setNiveau] = useState<string>('Débutant')
  const [payload, setPayload] = useState<QuizPayload | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState<Niveau | null>(null)
  const prevBadges = useRef<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    loadAttempts(user.uid)
      .then((a) => {
        if (!cancelled) setAttempts(a)
      })
      .catch((err) => logger.error('load attempts failed', err))
    return () => {
      cancelled = true
    }
  }, [user])

  const parcours = useMemo(() => buildParcours(sujets, attempts), [sujets, attempts])

  // Banderole de passage de niveau : déclenchée quand un nouveau badge apparaît.
  useEffect(() => {
    const count = parcours.badges.length
    if (prevBadges.current === null) {
      prevBadges.current = count
      return
    }
    if (count > prevBadges.current) {
      setCelebrate(parcours.badges[parcours.badges.length - 1])
    }
    prevBadges.current = count
  }, [parcours.badges])

  async function startQuiz(target: Sujet, lvl: string) {
    if (genLoading) return
    setSelected(target)
    setNiveau(lvl)
    setGenError(null)
    setGenLoading(true)
    setView('quiz')
    try {
      const p = await generateQuiz({ sujet: target.theme, niveau: lvl, angle: target.angle })
      setPayload(p)
      setSaved(false)
      setSaveError(null)
      setSaveWarning(null)
    } catch (err) {
      logger.error('generate quiz failed', err)
      setGenError(err instanceof Error ? err.message : 'Erreur inattendue')
      setView('parcours')
    } finally {
      setGenLoading(false)
    }
  }

  function startFromParcours(s: Sujet) {
    void startQuiz(s, s.niveau || 'Débutant')
  }

  function trainFromFiche(f: Fiche) {
    const match = sujets.find((s) => s.theme === f.sujet)
    const target: Sujet =
      match ?? {
        id: '',
        theme: f.sujet,
        domaine: f.domaine,
        niveau: f.niveau || 'Intermédiaire',
        angle: '',
        source: '',
        referentiels: [],
        priorite: '',
        ordre: 0,
      }
    setTab('parcours')
    void startQuiz(target, f.niveau || target.niveau || 'Intermédiaire')
  }

  async function handleSave(score: number, trace: string) {
    if (!user || !selected || !payload || saving) return
    setSaving(true)
    setSaveError(null)
    setSaveWarning(null)
    const total = payload.questions.length
    const percentage = pct(score, total)

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
        schema: payload.schema,
      })
      ficheOk = true
    } catch (err) {
      logger.error('create fiche failed', err)
      setSaveError(err instanceof Error ? err.message : 'Enregistrement de la fiche impossible')
    }

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
          'Fiche enregistrée, mais la progression (scores/XP) n’a pas pu être sauvée : déploie les règles Firestore (firebase deploy --only firestore:rules).',
        )
      }
    }

    if (ficheOk) {
      setSaved(true)
      void refetchFiches()
    }
    setSaving(false)
  }

  function exitToParcours() {
    setView('parcours')
    setPayload(null)
    setSaved(false)
    setSaveError(null)
    setSaveWarning(null)
  }

  const tabs: { id: Tab; label: string; icon: typeof MapIcon }[] = [
    { id: 'parcours', label: 'Mon Parcours', icon: MapIcon },
    { id: 'fiches', label: 'Mes fiches', icon: Library },
  ]

  return (
    <AppShell>
      <div className="col-scroll px-6 py-6 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-sage">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-cream-50 leading-tight">Apprendre</h2>
              <span className="eyebrow">Programme guidé · du général au spécifique</span>
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
          <FichesView fiches={fiches} loading={fichesLoading} error={fichesError} onTrain={trainFromFiche} />
        ) : view === 'quiz' && selected && (payload || genLoading) ? (
          genLoading && !payload ? (
            <div className="space-y-3 max-w-3xl">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-40" />
            </div>
          ) : payload ? (
            <QuizRunner
              questions={payload.questions}
              glossaire={payload.glossaire}
              enseignements={payload.enseignements}
              schema={payload.schema}
              sujet={selected.theme}
              onSave={(score, trace) => void handleSave(score, trace)}
              onReplay={() => void startQuiz(selected, niveau)}
              onExit={exitToParcours}
              saving={saving}
              saved={saved}
              saveError={saveError}
              saveWarning={saveWarning}
            />
          ) : null
        ) : (
          <>
            {isLoading && (
              <div className="space-y-3 max-w-3xl">
                <Skeleton className="h-20" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            )}

            {!isLoading && error && (
              <GlassCard depth="l3" tone="terracotta" className="p-5 max-w-3xl" hoverable={false}>
                <div className="flex items-start gap-2 text-sm text-terracotta-light">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Impossible de charger les sujets depuis Airtable.</p>
                    <p className="text-xs text-muted mt-1">{error.message}</p>
                  </div>
                </div>
              </GlassCard>
            )}

            {!isLoading && !error && (
              <>
                {genError && (
                  <div className="flex items-start gap-2 text-xs text-terracotta-light mb-4 max-w-3xl">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{genError}</span>
                  </div>
                )}
                <ParcoursView
                  parcours={parcours}
                  onStart={startFromParcours}
                  celebrate={celebrate}
                  onDismissCelebrate={() => setCelebrate(null)}
                />
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
