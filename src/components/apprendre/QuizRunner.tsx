import { useState } from 'react'
import { Check, X, ChevronRight, Trophy, PenLine, AlertCircle, BookOpen } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { GlossaryText } from '@/components/apprendre/GlossaryText'
import { cn } from '@/lib/utils'
import { pct } from '@/lib/quiz-stats'
import type { QuizQuestion, GlossaryItem } from '@/lib/quiz'

type Phase = 'running' | 'result'

export function QuizRunner({
  questions,
  glossaire,
  enseignements,
  sujet,
  onSave,
  onReplay,
  onExit,
  saving,
  saved,
  saveError,
  saveWarning,
}: {
  questions: QuizQuestion[]
  glossaire: GlossaryItem[]
  enseignements: string[]
  sujet: string
  onSave: (score: number, trace: string) => void
  onReplay: () => void
  onExit: () => void
  saving: boolean
  saved: boolean
  saveError: string | null
  saveWarning: string | null
}) {
  const [phase, setPhase] = useState<Phase>('running')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [validated, setValidated] = useState(false)
  const [answers, setAnswers] = useState<number[]>([])
  const [trace, setTrace] = useState('')

  const q = questions[index]
  const total = questions.length
  const isLast = index === total - 1
  const score = answers.reduce((acc, a, i) => acc + (a === questions[i].answerIndex ? 1 : 0), 0)
  const scorePct = pct(score, total)

  function choose(i: number) {
    if (validated) return
    setSelected(i)
  }

  function validate() {
    if (selected === null) return
    setValidated(true)
  }

  function next() {
    if (!validated || selected === null) return
    setAnswers((prev) => [...prev, selected])
    setSelected(null)
    setValidated(false)
    if (isLast) setPhase('result')
    else setIndex((n) => n + 1)
  }

  if (phase === 'result') {
    const tone = scorePct >= 80 ? 'sage' : scorePct >= 50 ? 'glacier' : 'terracotta'
    return (
      <div className="space-y-5 max-w-3xl">
        <GlassCard depth="l3" tone={tone} className="p-6" hoverable={false}>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-sage" />
            <div>
              <h3 className="text-lg font-semibold text-cream-50">
                {score}/{total} · {scorePct}%
              </h3>
              <span className="eyebrow">{sujet}</span>
            </div>
          </div>
        </GlassCard>

        {/* Fiche — enseignements à retenir */}
        {enseignements.length > 0 && (
          <GlassCard depth="l3" tone="glacier" className="p-5" hoverable={false}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-glacier" />
              <span className="eyebrow">À retenir · fiche</span>
            </div>
            <ul className="space-y-2">
              {enseignements.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-cream-50">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-glacier" />
                  <span className="leading-relaxed">
                    <GlossaryText text={e} glossaire={glossaire} />
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {/* Revue question par question */}
        <div className="space-y-3">
          {questions.map((qq, i) => {
            const given = answers[i]
            const ok = given === qq.answerIndex
            return (
              <GlassCard key={i} depth="flat" surface="flat" tone="neutral" hoverable={false} className="p-4">
                <div className="flex items-start gap-2">
                  <span className={cn('mt-0.5 shrink-0', ok ? 'text-sage' : 'text-terracotta-light')}>
                    {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream-50">
                      <GlossaryText text={qq.question} glossaire={glossaire} />
                    </p>
                    {!ok && (
                      <p className="mt-1 text-xs text-muted">
                        Ta réponse : <span className="text-terracotta-light">{qq.choices[given]}</span> ·
                        Bonne réponse : <span className="text-sage-light">{qq.choices[qq.answerIndex]}</span>
                      </p>
                    )}
                    {qq.explication && (
                      <p className="mt-1.5 text-xs text-muted leading-relaxed">
                        <GlossaryText text={qq.explication} glossaire={glossaire} />
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>

        {/* Trace — méthode JK 4 temps : la session produit un livrable */}
        <GlassCard depth="l3" tone="sage" className="p-5" hoverable={false}>
          <div className="flex items-center gap-2 mb-2">
            <PenLine className="h-3.5 w-3.5 text-sage" />
            <span className="eyebrow">Ta trace · 1 chose à retenir</span>
          </div>
          <p className="text-xs text-muted mb-3">
            La fiche (enseignements + glossaire) et ta note seront enregistrées dans « Mes fiches » pour réviser.
          </p>
          <textarea
            value={trace}
            onChange={(e) => setTrace(e.target.value)}
            rows={3}
            placeholder="Ex. : un bon system prompt ne suffit pas à bloquer une injection indirecte."
            disabled={saved}
            className="w-full px-4 py-3 rounded-xl bg-glass-7 border border-glass-10 text-cream-50 placeholder:text-muted-deeper focus:outline-none focus:border-sage/40 focus:bg-glass-10 transition-colors text-sm resize-y disabled:opacity-60"
          />

          {saveError && (
            <div className="mt-3 flex items-start gap-2 text-xs text-terracotta-light">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {saved && saveWarning && (
            <div className="mt-3 flex items-start gap-2 text-xs text-glacier-light">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{saveWarning}</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {saved ? (
              <GlassBadge tone="sage" className="gap-1">
                <Check className="h-3 w-3" /> Fiche enregistrée
              </GlassBadge>
            ) : (
              <GlassButton variant="sage" onClick={() => onSave(score, trace.trim())} loading={saving}>
                Enregistrer ma session
              </GlassButton>
            )}
            <GlassButton variant="ghost" onClick={onReplay} disabled={saving}>
              Rejouer
            </GlassButton>
            <GlassButton variant="ghost" onClick={onExit} disabled={saving}>
              Autre sujet
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Phase running
  const revealed = validated
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <span className="eyebrow">
          Question {index + 1} / {total}
        </span>
        <GlassBadge tone="neutral">{sujet}</GlassBadge>
      </div>

      <div className="h-1.5 w-full rounded-full bg-glass-7 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sage to-sage-deep transition-[width] duration-300"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <GlassCard depth="l3" tone="neutral" className="p-6" hoverable={false}>
        <p className="text-base font-medium text-cream-50 leading-snug mb-4">
          <GlossaryText text={q.question} glossaire={glossaire} />
        </p>
        <div className="space-y-2">
          {q.choices.map((c, i) => {
            const isCorrect = i === q.answerIndex
            const isPicked = i === selected
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={revealed}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center justify-between gap-3',
                  // Avant validation : surbrillance de la sélection, sans révéler.
                  !revealed && isPicked && 'bg-sage/15 border-sage/40 text-cream-50',
                  !revealed && !isPicked && 'bg-glass-7 border-glass-10 text-cream-50 hover:bg-glass-10',
                  // Après validation : on révèle.
                  revealed && isCorrect && 'bg-sage/15 border-sage/40 text-sage-light',
                  revealed && isPicked && !isCorrect && 'bg-terracotta/15 border-terracotta/40 text-terracotta-light',
                  revealed && !isCorrect && !isPicked && 'bg-glass-7 border-glass-10 text-muted',
                )}
              >
                <span>{c}</span>
                {!revealed && isPicked && <span className="h-2 w-2 rounded-full bg-sage shrink-0" />}
                {revealed && isCorrect && <Check className="h-4 w-4 shrink-0" />}
                {revealed && isPicked && !isCorrect && <X className="h-4 w-4 shrink-0" />}
              </button>
            )
          })}
        </div>

        {revealed && q.explication && (
          <div className="mt-4 p-3.5 rounded-xl bg-glass-7 border border-glass-10">
            <p className="text-xs text-muted leading-relaxed">
              <GlossaryText text={q.explication} glossaire={glossaire} />
            </p>
          </div>
        )}
      </GlassCard>

      <div className="flex justify-end">
        {!revealed ? (
          <GlassButton variant="sage" onClick={validate} disabled={selected === null}>
            Valider
          </GlassButton>
        ) : (
          <GlassButton variant="sage" onClick={next}>
            {isLast ? 'Voir le résultat' : 'Suivant'}
            <ChevronRight className="h-4 w-4" />
          </GlassButton>
        )}
      </div>
    </div>
  )
}
