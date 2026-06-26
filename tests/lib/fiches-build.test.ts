import { describe, it, expect } from 'vitest'
import { buildFicheFields, parseEnseignements, parseGlossaire } from '../../src/lib/fiches'

describe('buildFicheFields', () => {
  const now = new Date('2026-06-26T10:00:00Z')

  it('compose titre, score, schéma sérialisé et champs principaux', () => {
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
        schema: { kind: 'umbrella', nodes: [{ label: 'NLP' }, { label: 'NLU' }] },
      },
      now,
    )
    expect(f.Titre).toContain('NLP vs NLU vs NLG')
    expect(f.Titre).toContain('26/06/2026')
    expect(f.Date).toBe('2026-06-26')
    expect(f.Score).toBe('4/5')
    expect(f.Pourcentage).toBe(80)
    expect(f.Enseignements).toContain('• NLP est le parapluie.')
    expect(f.Glossaire).toContain('NLG : Natural Language Generation')
    expect(JSON.parse(f.Schema as string).kind).toBe('umbrella')
  })

  it('Schema vide si pas de schéma', () => {
    const f = buildFicheFields({
      sujet: 'X', domaine: '', niveau: '', score: 1, total: 2, pct: 50,
      enseignements: [], glossaire: [], trace: '', schema: null,
    })
    expect(f.Schema).toBe('')
  })
})

describe('parseEnseignements', () => {
  it('retire les puces et lignes vides', () => {
    expect(parseEnseignements('• A\n• B\n\n- C')).toEqual(['A', 'B', 'C'])
  })
})

describe('parseGlossaire', () => {
  it('sépare terme et définition sur " : "', () => {
    const g = parseGlossaire('NER : Named Entity Recognition\nRPA : Robotic Process Automation')
    expect(g).toHaveLength(2)
    expect(g[0]).toEqual({ terme: 'NER', definition: 'Named Entity Recognition' })
  })
})
