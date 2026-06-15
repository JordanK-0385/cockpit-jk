// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// airtableList + airtableUpdate mockés : aucun appel réseau, et on vérifie
// qu'airtableUpdate n'est JAMAIS invoqué tant que la résolution par titre est
// ambiguë (fail-closed — Protocole JK N4/N5).
const { airtableList, airtableUpdate } = vi.hoisted(() => ({
  airtableList: vi.fn(),
  airtableUpdate: vi.fn(),
}))
vi.mock('../../../api/_lib/airtable.js', () => ({ airtableList, airtableUpdate }))

import {
  updateTaskStatusTool,
  executeUpdateTaskStatus,
} from '../../../api/_lib/tools/updateTaskStatus.js'

beforeEach(() => {
  airtableList.mockReset()
  airtableUpdate.mockReset()
  airtableUpdate.mockResolvedValue({ records: [{ id: 'rec1', fields: {} }] })
})

describe('updateTaskStatusTool — schéma Anthropic exposé au modèle', () => {
  it('se nomme update_task_status, requiert titre + nouveau_statut, borne le statut à l’enum', () => {
    expect(updateTaskStatusTool.name).toBe('update_task_status')
    const schema = updateTaskStatusTool.input_schema as {
      properties: Record<string, { enum?: string[] }>
      required?: string[]
    }
    expect(schema.required).toEqual(['titre', 'nouveau_statut'])
    expect(Object.keys(schema.properties).sort()).toEqual(['nouveau_statut', 'titre'])
    expect(schema.properties.nouveau_statut.enum).toEqual([
      '🎯 À faire',
      '🚧 En cours',
      '🔍 À valider',
      '⏸ Bloqué',
      '✅ Terminé',
      '📋 Backlog',
    ])
  })
})

describe('executeUpdateTaskStatus — résolution par titre + fail-closed', () => {
  it('1 correspondance → airtableUpdate appelé une fois avec le bon id et le bon Statut', async () => {
    airtableList.mockResolvedValue({
      records: [{ id: 'recXYZ', fields: { 'Titre de la tâche': 'Préparer le pitch' } }],
    })

    const res = await executeUpdateTaskStatus({
      titre: 'Préparer le pitch',
      nouveau_statut: '🚧 En cours',
    })

    expect(airtableUpdate).toHaveBeenCalledTimes(1)
    expect(airtableUpdate).toHaveBeenCalledWith('Tâches', [
      { id: 'recXYZ', fields: { Statut: '🚧 En cours' } },
    ])
    expect(res).toEqual({
      ok: true,
      id: 'recXYZ',
      titre: 'Préparer le pitch',
      statut: '🚧 En cours',
    })
  })

  it('nouveau_statut hors enum → rejet, airtableUpdate jamais appelé (ni la recherche)', async () => {
    await expect(
      executeUpdateTaskStatus({ titre: 'OK', nouveau_statut: 'URGENT' }),
    ).rejects.toThrow()
    expect(airtableList).not.toHaveBeenCalled()
    expect(airtableUpdate).not.toHaveBeenCalled()
  })

  it('titre vide → rejet sans écriture', async () => {
    await expect(
      executeUpdateTaskStatus({ titre: '   ', nouveau_statut: '✅ Terminé' }),
    ).rejects.toThrow()
    expect(airtableUpdate).not.toHaveBeenCalled()
  })

  it('0 correspondance → rejet, airtableUpdate jamais appelé', async () => {
    airtableList.mockResolvedValue({ records: [] })

    await expect(
      executeUpdateTaskStatus({ titre: 'Inconnue', nouveau_statut: '✅ Terminé' }),
    ).rejects.toThrow(/aucune tâche/i)
    expect(airtableUpdate).not.toHaveBeenCalled()
  })

  it('>1 correspondance → rejet, airtableUpdate jamais appelé', async () => {
    airtableList.mockResolvedValue({
      records: [
        { id: 'rec1', fields: { 'Titre de la tâche': 'Doublon' } },
        { id: 'rec2', fields: { 'Titre de la tâche': 'Doublon' } },
      ],
    })

    await expect(
      executeUpdateTaskStatus({ titre: 'Doublon', nouveau_statut: '✅ Terminé' }),
    ).rejects.toThrow(/plusieurs tâches/i)
    expect(airtableUpdate).not.toHaveBeenCalled()
  })

  it('échappe les guillemets du titre dans le filterByFormula', async () => {
    airtableList.mockResolvedValue({
      records: [{ id: 'recQ', fields: { 'Titre de la tâche': 'Appeler "Le Monde"' } }],
    })

    await executeUpdateTaskStatus({
      titre: 'Appeler "Le Monde"',
      nouveau_statut: '🔍 À valider',
    })

    const [table, query] = airtableList.mock.calls[0]
    expect(table).toBe('Tâches')
    expect(query.filterByFormula).toContain('\\"Le Monde\\"')
  })
})
