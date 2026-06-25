import { useState } from 'react'
import { Check, X, ChevronRight, Trophy, PenLine } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassButton } from '@/components/ui/GlassButton'
import { GlassBadge } from '@/components/ui/GlassBadge'
import { cn } from '@/lib/utils'
import { pct } from '@/lib/quiz-stats'
import type { QuizQuestion } from '@/lib/quiz'

type Phase = 'running' | 'result'

export function QuizRunner({
  questions,
  sujet,
  onSave,
  onReplay,
  onExit,
  saving,
  saved,
}: {
  questions: QuizQuestion[]
  sujet: string
  onSave: (score: number, trace: string) => void
  onReplay: () => void
  onExit: () => void
  saving: boolean
  saved: boolean
}) {
  const [phase, setPhase] = useState<Phase>('running')
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [trace, setTrace] = useState('')

  const q = questions[index]
  const total = questions.length
  const isLast = index === total - 1
  const score = answers.reduce((acc, a, i) => acc + (a === questions[i].answerIndex ? 1 : 0), 0)
  const scorePct = pct(score, total)

  function choose(i: number) {
    if (picked !== null) return
    setPicked(i)
  }

  function next() {
    if (picked === null) return
    const nextAnswers = [...answers, picked]
    setAnswers(nextAnswers)
    setPicked(null)
    if (isLast) {
      setPhase('result')
    } else {
      setIndex((n) => n + 1)
    }
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
                    <p className="text-sm font-medium text-cream-50">{qq.question}</p>
                    {!ok && (
                      <p className="mt-1 text-xs text-muted">
                        Ta réponse : <span className="text-terracotta-light">{qq.choices[given]}</span> ·
                        Bonne réponse : <span className="text-sage-light">{qq.choices[qq.answerIndex]}</span>
                      </p>
                    )}
                    {qq.explication && (
                      <p className="mt-1.5 text-xs text-muted leading-relaxed">{qq.explication}</p>
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
            Apprentissage = livrable. Note le surlignage, le piège ou la règle que tu retiens — pas «&nbsp;c'est intéressant&nbsp;».
          </p>
          <textarea
            value={trace}
            onChange={(e) => setTrace(e.target.value)}
            rows={3}
            placeholder="Ex. : un bon system prompt ne suffit pas à bloquer une injection indirecte."
            disabled={saved}
            className="w-full px-4 py-3 rounded-xl bg-glass-7 border border-glass-10 text-cream-50 placeholder:text-muted-deeper focus:outline-none focus:border-sage/40 focus:bg-glass-10 transition-colors text-sm resize-y disabled:opacity-60"
          />
          <div className="mt-3 flex items-center gap-2">
            {saved ? (
              <GlassBadge tone="sage" className="gap-1">
                <Check className="h-3 w-3" /> Session enregistrée
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
        <p className="text-base font-medium text-cream-50 leading-snug mb-4">{q.question}</p>
        <div className="space-y-2">
          {q.choices.map((c, i) => {
            const revealed = picked !== null
            const isCorrect = i === q.answerIndex
            const isPicked = i === picked
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={revealed}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center justify-between gap-3',
                  !revealed && 'bg-glass-7 border-glass-10 text-cream-50 hover:bg-glass-10',
                  revealed && isCorrect && 'bg-sage/15 border-sage/40 text-sage-light',
                  revealed && isPicked && !isCorrect && 'bg-terracotta/15 border-terracotta/40 text-terracotta-light',
                  revealed && !isCorrect && !isPicked && 'bg-glass-7 border-glass-10 text-muted',
                )}
              >
                <span>{c}</span>
                {revealed && isCorrect && <Check className="h-4 w-4 shrink-0" />}
                {revealed && isPicked && !isCorrect && <X className="h-4 w-4 shrink-0" />}
              </button>
            )
          })}
        </div>

        {picked !== null && q.explication && (
          <div className="mt-4 p-3.5 rounded-xl bg-glass-7 border border-glass-10">
            <p className="text-xs text-muted leading-relaxed">{q.explication}</p>
          </div>
        )}
      </GlassCard>

      <div className="flex justify-end">
        <GlassButton variant="sage" onClick={next} disabled={picked === null}>
          {isLast ? 'Voir le résultat' : 'Suivant'}
          <ChevronRight className="h-4 w-4" />
        </GlassButton>
      </div>
    </div>
  )
}
