// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildQuizUserPrompt,
  parseQuizResponse,
  stripCodeFences,
  clampCount,
  DEFAULT_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
} from '../../api/_lib/quiz'

const validJson = JSON.stringify({
  questions: [
    {
      question: 'Que teste un QCM bien conçu ?',
      choices: ['La logique seule', 'La connaissance réelle', 'La chance', 'Rien'],
      answerIndex: 1,
      explication: 'Des distracteurs plausibles empêchent de répondre par élimination.',
    },
    {
      question: 'Quel article du RGPD encadre la sous-traitance ?',
      choices: ['Art. 6', 'Art. 17', 'Art. 28', 'Art. 99'],
      answerIndex: 2,
      explication: "L'art. 28 régit le contrat responsable/sous-traitant.",
    },
  ],
})

describe('clampCount', () => {
  it('défaut si absent ou invalide', () => {
    expect(clampCount(undefined)).toBe(DEFAULT_QUESTION_COUNT)
    expect(clampCount(NaN)).toBe(DEFAULT_QUESTION_COUNT)
  })
  it('borne entre 1 et MAX', () => {
    expect(clampCount(0)).toBe(1)
    expect(clampCount(999)).toBe(MAX_QUESTION_COUNT)
    expect(clampCount(3)).toBe(3)
  })
})

describe('stripCodeFences', () => {
  it('retire un emballage ```json', () => {
    const wrapped = '```json\n{"a":1}\n```'
    expect(stripCodeFences(wrapped)).toBe('{"a":1}')
  })
  it('laisse le texte nu inchangé', () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}')
  })
})

describe('buildQuizUserPrompt', () => {
  it('inclut sujet, niveau et le nombre demandé', () => {
    const p = buildQuizUserPrompt({ sujet: 'NER', niveau: 'Débutant', n: 3 })
    expect(p).toContain('Sujet : NER')
    expect(p).toContain('Niveau : Débutant')
    expect(p).toContain('exactement 3 questions')
  })
  it("inclut l'angle quand fourni", () => {
    const p = buildQuizUserPrompt({ sujet: 'X', niveau: 'Expert', angle: 'pièges courants' })
    expect(p).toContain('Angle à couvrir')
    expect(p).toContain('pièges courants')
  })
})

describe('parseQuizResponse', () => {
  it('parse un JSON valide', () => {
    const qs = parseQuizResponse(validJson)
    expect(qs).toHaveLength(2)
    expect(qs[0].answerIndex).toBe(1)
    expect(qs[1].choices[2]).toBe('Art. 28')
  })
  it('tolère un emballage Markdown', () => {
    const qs = parseQuizResponse('```json\n' + validJson + '\n```')
    expect(qs).toHaveLength(2)
  })
  it('tolère un préambule avant le JSON', () => {
    const qs = parseQuizResponse('Voici les questions :\n' + validJson)
    expect(qs).toHaveLength(2)
  })
  it('rejette un answerIndex hors limites', () => {
    const bad = JSON.stringify({
      questions: [{ question: 'q', choices: ['a', 'b'], answerIndex: 5, explication: '' }],
    })
    expect(() => parseQuizResponse(bad)).toThrow(/answerIndex/)
  })
  it('rejette une absence de questions', () => {
    expect(() => parseQuizResponse('{"questions":[]}')).toThrow(/aucune question/i)
  })
  it('rejette un JSON non parsable', () => {
    expect(() => parseQuizResponse('pas du json')).toThrow()
  })
})
