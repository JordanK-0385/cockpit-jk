import { getIdToken } from './firebase'

/** Module Apprendre — client de l'endpoint /api/claude/quiz (proxy Vercel). */
export type QuizQuestion = {
  question: string
  choices: string[]
  answerIndex: number
  explication: string
}

export type GlossaryItem = {
  terme: string
  definition: string
}

export type SchemaKind = 'umbrella' | 'flow' | 'compare' | 'layers'
export type SchemaNode = { label: string; sub?: string }
export type FicheSchema = {
  kind: SchemaKind
  title?: string
  nodes: SchemaNode[]
}

export type QuizPayload = {
  questions: QuizQuestion[]
  glossaire: GlossaryItem[]
  enseignements: string[]
  schema: FicheSchema | null
}

export type GenerateQuizInput = {
  sujet: string
  niveau: string
  angle?: string
  n?: number
}

export async function generateQuiz(input: GenerateQuizInput): Promise<QuizPayload> {
  const token = await getIdToken()
  if (!token) throw new Error('Non authentifié')

  const res = await fetch('/api/claude/quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Quiz indisponible (${res.status})${detail ? ` : ${detail}` : ''}`)
  }
  const data = (await res.json()) as Partial<QuizPayload>
  if (!data.questions || data.questions.length === 0) {
    throw new Error('Aucune question générée')
  }
  return {
    questions: data.questions,
    glossaire: data.glossaire ?? [],
    enseignements: data.enseignements ?? [],
    schema: data.schema ?? null,
  }
}
