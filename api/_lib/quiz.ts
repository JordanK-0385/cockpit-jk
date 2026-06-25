/**
 * Module Apprendre — logique pure de génération/parsing des QCM.
 *
 * Séparé de l'endpoint (api/claude/quiz.ts) pour être testable sans I/O ni
 * appel SDK, sur le même modèle que api/_lib/anthropic.ts. L'endpoint
 * importe ce module ; les tests aussi.
 */

export type QuizQuestion = {
  /** Énoncé de la question. */
  question: string
  /** Propositions (exactement une correcte). */
  choices: string[]
  /** Index (0-based) de la bonne proposition dans `choices`. */
  answerIndex: number
  /** Justification : pourquoi la bonne réponse l'est, et le piège principal. */
  explication: string
}

export type QuizParams = {
  sujet: string
  niveau: string
  angle?: string
  n?: number
}

// Modèle aligné sur le choix Radar (claude-sonnet-4-6), surchargeable par env.
export const QUIZ_MODEL = process.env.CLAUDE_QUIZ_MODEL || 'claude-sonnet-4-6'
// Le prototype était plafonné à 1000 (JSON tronqué → bouton réessayer). Dans le
// Cockpit on maîtrise l'appel : on monte pour 5 QCM + explications sans troncature.
export const QUIZ_MAX_TOKENS = 2048
export const DEFAULT_QUESTION_COUNT = 5
export const MAX_QUESTION_COUNT = 10

export const QUIZ_SYSTEM_PROMPT = `Tu es un concepteur de QCM exigeant pour la formation continue d'un consultant IA et automatisation (JK Consulting).
Tu génères des questions à choix multiples en français, précises, sans ambiguïté, avec une seule bonne réponse par question.
Règles :
- 4 propositions par question, exactement une correcte.
- Les distracteurs sont plausibles : on teste la connaissance réelle, pas la logique d'élimination.
- L'explication justifie la bonne réponse ET dit pourquoi le piège principal est faux, en 1 à 2 phrases.
- Calibre la difficulté sur le niveau demandé.
Tu réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, sans bloc Markdown.`

/** Construit le message utilisateur (déterministe → testable). */
export function buildQuizUserPrompt(p: QuizParams): string {
  const n = clampCount(p.n)
  const lines = [`Sujet : ${p.sujet}`, `Niveau : ${p.niveau}`]
  if (p.angle && p.angle.trim()) lines.push(`Angle à couvrir en priorité : ${p.angle.trim()}`)
  lines.push('')
  lines.push(`Génère exactement ${n} questions.`)
  lines.push('Réponds avec ce format JSON STRICT :')
  lines.push(
    '{"questions":[{"question":"...","choices":["A","B","C","D"],"answerIndex":0,"explication":"..."}]}',
  )
  lines.push('"answerIndex" est l\'index (0 à 3) de la bonne proposition dans "choices".')
  return lines.join('\n')
}

export function clampCount(n?: number): number {
  if (n === undefined || n === null || !Number.isFinite(n)) return DEFAULT_QUESTION_COUNT
  return Math.max(1, Math.min(MAX_QUESTION_COUNT, Math.floor(n)))
}

/** Retire un éventuel emballage ```json ... ``` autour du JSON. */
export function stripCodeFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenced ? fenced[1] : raw).trim()
}

/**
 * Parse la réponse texte du modèle en QuizQuestion[]. Tolérant à un éventuel
 * préambule : si JSON.parse direct échoue, on extrait le premier objet {...}.
 * Lève une erreur explicite si le JSON est valide mais mal formé.
 */
export function parseQuizResponse(raw: string): QuizQuestion[] {
  const text = stripCodeFences(raw)
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Réponse du modèle non parsable en JSON')
    }
    data = JSON.parse(text.slice(start, end + 1))
  }
  const questions = (data as { questions?: unknown })?.questions
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('JSON valide mais aucune question trouvée')
  }
  return questions.map((q, i) => normalizeQuestion(q, i))
}

function normalizeQuestion(q: unknown, i: number): QuizQuestion {
  const obj = q as Record<string, unknown>
  const question = typeof obj?.question === 'string' ? obj.question.trim() : ''
  const choices = Array.isArray(obj?.choices)
    ? obj.choices.filter((c): c is string => typeof c === 'string').map((c) => c.trim())
    : []
  const answerIndex = typeof obj?.answerIndex === 'number' ? Math.floor(obj.answerIndex) : -1
  const explication = typeof obj?.explication === 'string' ? obj.explication.trim() : ''

  if (!question) throw new Error(`Question ${i + 1} : énoncé manquant`)
  if (choices.length < 2) throw new Error(`Question ${i + 1} : au moins 2 propositions requises`)
  if (answerIndex < 0 || answerIndex >= choices.length) {
    throw new Error(`Question ${i + 1} : answerIndex hors limites`)
  }
  return { question, choices, answerIndex, explication }
}
