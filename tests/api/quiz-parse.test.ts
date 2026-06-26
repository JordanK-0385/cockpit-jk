// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  buildQuizUserPrompt,
  parseQuizResponse,
  stripCodeFences,
  clampCount,
  normalizeGlossary,
  normalizeStringList,
  DEFAULT_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
} from '../../api/_lib/quiz'

const valid = {
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
  glossaire: [{ terme: 'NLU', definition: 'Natural Language Understanding : compréhension.' }],
  enseignements: ['Un bon distracteur est plausible.', "L'art. 28 cadre la sous-traitance."],
}
const validJson = JSON.stringify(valid)

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
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
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
  it('réclame glossaire et enseignements dans le format', () => {
    const p = buildQuizUserPrompt({ sujet: 'X', niveau: 'Expert' })
    expect(p).toContain('glossaire')
    expect(p).toContain('enseignements')
  })
})

describe('normalizeGlossary', () => {
  it('garde les entrées complètes, ignore les autres', () => {
    const g = normalizeGlossary([
      { terme: 'NER', definition: 'Named Entity Recognition' },
      { terme: '', definition: 'vide' },
      { terme: 'X', definition: '' },
      'pas un objet',
    ])
    expect(g).toHaveLength(1)
    expect(g[0].terme).toBe('NER')
  })
  it('renvoie [] si non-array', () => {
    expect(normalizeGlossary(undefined)).toEqual([])
  })
})

describe('normalizeStringList', () => {
  it('filtre les non-strings et le vide', () => {
    expect(normalizeStringList(['a', '', 'b', 3, null])).toEqual(['a', 'b'])
  })
})

describe('parseQuizResponse', () => {
  it('parse questions + glossaire + enseignements', () => {
    const p = parseQuizResponse(validJson)
    expect(p.questions).toHaveLength(2)
    expect(p.questions[0].answerIndex).toBe(1)
    expect(p.glossaire[0].terme).toBe('NLU')
    expect(p.enseignements).toHaveLength(2)
  })
  it('tolère un emballage Markdown', () => {
    expect(parseQuizResponse('```json\n' + validJson + '\n```').questions).toHaveLength(2)
  })
  it('tolère un préambule avant le JSON', () => {
    expect(parseQuizResponse('Voici :\n' + validJson).questions).toHaveLength(2)
  })
  it('défaut glossaire/enseignements vides si absents', () => {
    const minimal = JSON.stringify({ questions: valid.questions })
    const p = parseQuizResponse(minimal)
    expect(p.glossaire).toEqual([])
    expect(p.enseignements).toEqual([])
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
