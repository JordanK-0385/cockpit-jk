import { describe, it, expect } from 'vitest'
import { buildFicheFields } from '../../src/lib/fiches'

describe('buildFicheFields', () => {
  const now = new Date('2026-06-26T10:00:00Z')

  it('compose le titre avec sujet + date FR et les champs principaux', () => {
    const f = buildFicheFields(
      {
        sujet: 'NLP vs NLU vs NLG',
        domaine: 'Concepts & Acronymes',
        niveau: 'Débutant',
        score: 4,
        total: 5,
        pct: 80,
        enseignements: ['NLP est le parapluie.', 'NLU = compréhension.'],
        glossaire: [{ terme: 'NLG', definition: 'Natural Language Generation' }],
        trace: 'Ne plus confondre NLP et NLU.',
      },
      now,
    )
    expect(f.Titre).toContain('NLP vs NLU vs NLG')
    expect(f.Titre).toContain('26/06/2026')
    expect(f.Date).toBe('2026-06-26')
    expect(f.Score).toBe('4/5')
    expect(f.Pourcentage).toBe(80)
    expect(f.Source).toBe('Module Apprendre')
    expect(f.Enseignements).toContain('• NLP est le parapluie.')
    expect(f.Glossaire).toContain('NLG : Natural Language Generation')
    expect(f.Trace).toBe('Ne plus confondre NLP et NLU.')
  })
})
