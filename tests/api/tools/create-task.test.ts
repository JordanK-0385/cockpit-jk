// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// airtableCreate est mocké : aucun appel réseau, et on vérifie qu'il n'est
// JAMAIS invoqué quand l'input est invalide (sécurité by design — Protocole JK).
const { airtableCreate } = vi.hoisted(() => ({ airtableCreate: vi.fn() }))
vi.mock('../../../api/_lib/airtable.js', () => ({ airtableCreate }))

import { createTaskTool, executeCreateTask } from '../../../api/_lib/tools/createTask.js'

beforeEach(() => {
  airtableCreate.mockReset()
  airtableCreate.mockResolvedValue({ records: [{ id: 'recABC', fields: {} }] })
})

describe('createTaskTool — schéma Anthropic exposé au modèle', () => {
  it('se nomme create_task, requiert titre, et borne priorite à l’enum', () => {
    expect(createTaskTool.name).toBe('create_task')
    const schema = createTaskTool.input_schema as {
      properties: Record<string, { enum?: string[] }>
      required?: string[]
    }
    expect(schema.required).toEqual(['titre'])
    expect(Object.keys(schema.properties).sort()).toEqual(['date_cible', 'priorite', 'titre'])
    expect(schema.properties.priorite.enum).toEqual(['🔴 Haute', '🟠 Moyenne', '🟢 Basse'])
  })
})

describe('executeCreateTask — validation backend + mapping vers Airtable', () => {
  it('titre valide seul → écrit dans "Tâches" avec Statut forcé, et renvoie l’écho', async () => {
    const res = await executeCreateTask({ titre: '  Préparer le pitch  ' })

    expect(airtableCreate).toHaveBeenCalledTimes(1)
    expect(airtableCreate).toHaveBeenCalledWith('Tâches', [
      { 'Titre de la tâche': 'Préparer le pitch', 'Statut': '🎯 À faire' },
    ])
    expect(res).toEqual({ ok: true, id: 'recABC', titre: 'Préparer le pitch' })
  })

  it('titre + priorite + date_cible valides → mappe les trois champs', async () => {
    await executeCreateTask({
      titre: 'Appeler le client',
      priorite: '🟠 Moyenne',
      date_cible: '2026-06-20',
    })

    expect(airtableCreate).toHaveBeenCalledWith('Tâches', [
      {
        'Titre de la tâche': 'Appeler le client',
        'Statut': '🎯 À faire',
        'Priorité': '🟠 Moyenne',
        'Date cible': '2026-06-20',
      },
    ])
  })

  it('titre vide (après trim) → rejet sans écriture', async () => {
    await expect(executeCreateTask({ titre: '   ' })).rejects.toThrow()
    expect(airtableCreate).not.toHaveBeenCalled()
  })

  it('titre manquant → rejet sans écriture', async () => {
    await expect(executeCreateTask({})).rejects.toThrow()
    expect(airtableCreate).not.toHaveBeenCalled()
  })

  it('titre > 200 caractères → rejet sans écriture', async () => {
    await expect(executeCreateTask({ titre: 'x'.repeat(201) })).rejects.toThrow()
    expect(airtableCreate).not.toHaveBeenCalled()
  })

  it('priorite hors enum → rejet sans écriture', async () => {
    await expect(
      executeCreateTask({ titre: 'OK', priorite: 'URGENT' }),
    ).rejects.toThrow()
    expect(airtableCreate).not.toHaveBeenCalled()
  })

  it('date_cible mal formée → rejet sans écriture', async () => {
    await expect(
      executeCreateTask({ titre: 'OK', date_cible: '20/06/2026' }),
    ).rejects.toThrow()
    expect(airtableCreate).not.toHaveBeenCalled()
  })
})
