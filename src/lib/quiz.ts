import { getIdToken } from './firebase'

/**
 * Module Apprendre — client de l'endpoint /api/claude/quiz (proxy Vercel).
 * Types redéclarés côté front (comme focus.ts) pour ne pas tirer de
 * dépendances serveur dans le bundle client.
 */
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

export type QuizPayload = {
  questions: QuizQuestion[]
  glossaire: GlossaryItem[]
  enseignements: string[]
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
  }
}
