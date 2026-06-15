// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// On mocke l'executor : la registry est testée en isolation (routage +
// allowlist), sans toucher à Airtable.
const { executeCreateTask, executeUpdateTaskStatus } = vi.hoisted(() => ({
  executeCreateTask: vi.fn(),
  executeUpdateTaskStatus: vi.fn(),
}))
vi.mock('../../../api/_lib/tools/createTask.js', () => ({
  executeCreateTask,
  createTaskTool: { name: 'create_task', input_schema: { type: 'object', properties: {} } },
}))
vi.mock('../../../api/_lib/tools/updateTaskStatus.js', () => ({
  executeUpdateTaskStatus,
  updateTaskStatusTool: {
    name: 'update_task_status',
    input_schema: { type: 'object', properties: {} },
  },
}))

import { runTool, toolSchemas } from '../../../api/_lib/tools/registry.js'

beforeEach(() => {
  executeCreateTask.mockReset()
  executeUpdateTaskStatus.mockReset()
})

describe('registry — allowlist stricte des tools', () => {
  it('expose create_task et update_task_status au modèle', () => {
    expect(toolSchemas.map((t) => t.name)).toEqual(['create_task', 'update_task_status'])
  })

  it('update_task_status → délègue à l’executor et renvoie un résultat non-erreur', async () => {
    executeUpdateTaskStatus.mockResolvedValue({
      ok: true,
      id: 'recU',
      titre: 'T',
      statut: '✅ Terminé',
    })

    const res = await runTool('update_task_status', { titre: 'T', nouveau_statut: '✅ Terminé' })

    expect(executeUpdateTaskStatus).toHaveBeenCalledWith({ titre: 'T', nouveau_statut: '✅ Terminé' })
    expect(res.isError).toBe(false)
    expect(res.content).toContain('recU')
  })

  it('create_task → délègue à l’executor et renvoie un résultat non-erreur', async () => {
    executeCreateTask.mockResolvedValue({ ok: true, id: 'rec1', titre: 'T' })

    const res = await runTool('create_task', { titre: 'T' })

    expect(executeCreateTask).toHaveBeenCalledWith({ titre: 'T' })
    expect(res.isError).toBe(false)
    expect(res.content).toContain('rec1')
  })

  it('nom de tool inconnu → rejet sans exécuter aucun executor', async () => {
    const res = await runTool('delete_everything', { x: 1 })

    expect(res.isError).toBe(true)
    expect(executeCreateTask).not.toHaveBeenCalled()
  })

  it('erreur de validation de l’executor → tool_result is_error avec le message', async () => {
    executeCreateTask.mockRejectedValue(new Error('Le titre ne peut pas être vide.'))

    const res = await runTool('create_task', { titre: '' })

    expect(res.isError).toBe(true)
    expect(res.content).toContain('titre')
  })
})
