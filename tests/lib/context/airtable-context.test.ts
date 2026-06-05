// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  toProjectView,
  toTaskView,
  formatAirtableContext,
  type ContextData,
} from '../../../api/_lib/context/airtableContext'

describe('mappeurs record → view (minimisation)', () => {
  it('toProjectView : % fraction → entier, champs manquants tolérés', () => {
    expect(
      toProjectView({ fields: { 'Nom du projet': 'Cockpit JK', 'Statut': '🏗️ En cours', '% Avancement': 0.45 } }),
    ).toEqual({ nom: 'Cockpit JK', statut: '🏗️ En cours', avancement: 45 })
  })

  it('toProjectView : 0% est rendu (avancement = 0, pas undefined)', () => {
    expect(toProjectView({ fields: { 'Nom du projet': 'X', '% Avancement': 0 } }).avancement).toBe(0)
  })

  it('toTaskView : projette titre/statut/priorité/échéance', () => {
    expect(
      toTaskView({ fields: { 'Titre de la tâche': 'Activer crons', 'Statut': '🎯 À faire', 'Priorité': '🔴 Haute', 'Date cible': '2026-06-05' } }),
    ).toEqual({ titre: 'Activer crons', statut: '🎯 À faire', priorite: '🔴 Haute', echeance: '2026-06-05' })
  })
})

describe('formatAirtableContext', () => {
  const data: ContextData = {
    projects: [{ nom: 'Cockpit JK', statut: '🏗️ En cours', avancement: 45 }],
    tasks: [{ titre: 'Activer crons', statut: '🎯 À faire', priorite: '🔴 Haute', echeance: '2026-06-05' }],
    blockers: [{ titre: 'Vérif entreprise Meta', statut: '⏸ Bloqué', priorite: '🔴 Haute', echeance: undefined }],
    sessions: [],
  }

  it('rend les projets avec leur % et les tâches du jour', () => {
    const out = formatAirtableContext(data)
    expect(out).toContain('Cockpit JK')
    expect(out).toContain('45%')
    expect(out).toContain('Activer crons')
    expect(out).toContain('Vérif entreprise Meta')
  })

  it('gère les listes vides sans planter (mention explicite)', () => {
    const out = formatAirtableContext({ projects: [], tasks: [], blockers: [], sessions: [] })
    expect(out).toMatch(/aucune tâche/i)
    expect(out).toMatch(/aucun bloquant/i)
  })
})
