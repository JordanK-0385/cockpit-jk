// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  activeProjectsQuery,
  todayTasksQuery,
  openBlockersQuery,
  recentSessionsQuery,
} from '../../api/_lib/airtable'

describe('query-builders de lecture du contexte', () => {
  it('activeProjectsQuery : exclut les statuts terminaux, trie par % desc, cap 5', () => {
    const q = activeProjectsQuery()
    expect(q.fields).toEqual([
      'Nom du projet', 'Statut', '% Avancement', 'Priorité', 'Date cible',
    ])
    expect(q.filterByFormula).toBe(
      'AND({Statut}!="📋 Backlog",{Statut}!="✅ Stable",{Statut}!="⏸️ En pause")',
    )
    expect(q.sort).toEqual([{ field: '% Avancement', direction: 'desc' }])
    expect(q.maxRecords).toBe(5)
  })

  it('todayTasksQuery : non terminé ET échéance = date du jour injectée', () => {
    const q = todayTasksQuery('2026-06-05')
    expect(q.fields).toEqual(['Titre de la tâche', 'Statut', 'Priorité', 'Date cible'])
    expect(q.filterByFormula).toBe(
      `AND({Statut}!="✅ Terminé",IS_SAME({Date cible},"2026-06-05",'day'))`,
    )
    expect(q.maxRecords).toBe(20)
  })

  it('openBlockersQuery : Bloquant coché ET non terminé', () => {
    const q = openBlockersQuery()
    expect(q.fields).toEqual(['Titre de la tâche', 'Statut', 'Priorité'])
    expect(q.filterByFormula).toBe('AND({Bloquant}=1,{Statut}!="✅ Terminé")')
    expect(q.maxRecords).toBe(10)
  })

  it('recentSessionsQuery : tri Date desc, cap = n', () => {
    const q = recentSessionsQuery(3)
    expect(q.fields).toEqual(['Résumé', 'Focus du jour', 'Date', 'Type'])
    expect(q.sort).toEqual([{ field: 'Date', direction: 'desc' }])
    expect(q.maxRecords).toBe(3)
    expect(q.filterByFormula).toBeUndefined()
  })

  it('todayTasksQuery : rejette un format de date invalide', () => {
    expect(() => todayTasksQuery('05/06/2026')).toThrow(/YYYY-MM-DD/)
  })

  it('recentSessionsQuery : rejette n < 1', () => {
    expect(() => recentSessionsQuery(0)).toThrow()
  })
})
