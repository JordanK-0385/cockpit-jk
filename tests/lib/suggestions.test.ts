// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildSuggestions } from '../../src/lib/suggestions'
import type { TacheFields, ProjetFields, SessionFields } from '../../src/lib/types'

const TASKS_LINE = 'Fais-moi le point sur mes tâches actives'
const BLOCK_LINE = "Qu'est-ce qui bloque en ce moment ?"
const SESSIONS_LINE = 'Récap de mes 3 dernières sessions'
const FALLBACK = ["Qu'est-ce que je fais aujourd'hui ?", 'Récap de mes dernières sessions']

function task(over: Partial<TacheFields> = {}): TacheFields {
  return { 'Titre de la tâche': 'Tâche', ...over }
}
function project(over: Partial<ProjetFields> = {}): ProjetFields {
  return { 'Nom du projet': 'Projet', ...over }
}
const session: SessionFields = { Résumé: 'hier' }

describe('buildSuggestions — puces déterministes dérivées du contexte', () => {
  it('propose la puce tâches quand il y a des tâches actives', () => {
    const out = buildSuggestions({ tasks: [task()], projects: [], sessions: [] })
    expect(out).toContain(TASKS_LINE)
  })

  it('propose la puce bloquant quand une tâche est marquée Bloquant', () => {
    const out = buildSuggestions({
      tasks: [task(), task({ Bloquant: true })],
      projects: [],
      sessions: [],
    })
    expect(out).toContain(BLOCK_LINE)
  })

  it('ne propose PAS la puce bloquant si aucune tâche n’est bloquante', () => {
    const out = buildSuggestions({ tasks: [task({ Bloquant: false })], projects: [], sessions: [] })
    expect(out).not.toContain(BLOCK_LINE)
  })

  it('propose « Où en est <projet le plus avancé> ? » avec le nom exact', () => {
    const out = buildSuggestions({
      tasks: [],
      projects: [
        project({ 'Nom du projet': 'Veille auto', '% Avancement': 0.2 }),
        project({ 'Nom du projet': 'Cockpit JK', '% Avancement': 0.8 }),
      ],
      sessions: [],
    })
    expect(out).toContain('Où en est Cockpit JK ?')
    expect(out).not.toContain('Où en est Veille auto ?')
  })

  it('met toujours la puce sessions en dernier dès qu’il y a des données', () => {
    const out = buildSuggestions({
      tasks: [task()],
      projects: [project()],
      sessions: [session],
    })
    expect(out[out.length - 1]).toBe(SESSIONS_LINE)
  })

  it('retombe sur le fallback générique quand toutes les listes sont vides', () => {
    expect(buildSuggestions({ tasks: [], projects: [], sessions: [] })).toEqual(FALLBACK)
  })

  it('renvoie toujours entre 2 et 4 éléments', () => {
    const maximal = buildSuggestions({
      tasks: [task(), task({ Bloquant: true })],
      projects: [project({ '% Avancement': 0.5 })],
      sessions: [session, session, session],
    })
    expect(maximal.length).toBeGreaterThanOrEqual(2)
    expect(maximal.length).toBeLessThanOrEqual(4)

    const minimal = buildSuggestions({ tasks: [], projects: [], sessions: [] })
    expect(minimal.length).toBeGreaterThanOrEqual(2)
    expect(minimal.length).toBeLessThanOrEqual(4)
  })
})
