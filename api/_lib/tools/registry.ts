import type Anthropic from '@anthropic-ai/sdk'
import { createTaskTool, executeCreateTask } from './createTask.js'
import { updateTaskStatusTool, executeUpdateTaskStatus } from './updateTaskStatus.js'

/**
 * Allowlist stricte des tools exécutables (Protocole JK N4/N5).
 *
 * Entrées autorisées : create_task (écriture), update_task_status (modification
 * de Statut). Tout nom hors de cette map est rejeté par runTool — le modèle ne
 * peut déclencher aucune autre écriture, et il n'y a aucun chemin générique vers
 * airtableCreate/airtableUpdate.
 */

type ToolExecutor = (input: unknown) => Promise<unknown>

type ToolEntry = {
  schema: Anthropic.Tool
  execute: ToolExecutor
}

const ALLOWLIST: Record<string, ToolEntry> = {
  create_task: {
    schema: createTaskTool,
    execute: (input) => executeCreateTask(input as Parameters<typeof executeCreateTask>[0]),
  },
  update_task_status: {
    schema: updateTaskStatusTool,
    execute: (input) =>
      executeUpdateTaskStatus(input as Parameters<typeof executeUpdateTaskStatus>[0]),
  },
}

// Schémas à passer dans buildAnthropicPayload({ tools }).
export const toolSchemas: Anthropic.Tool[] = Object.values(ALLOWLIST).map((e) => e.schema)

export type ToolRunResult = {
  isError: boolean
  /** Contenu texte du tool_result renvoyé au modèle. */
  content: string
}

/**
 * Exécute un tool de l'allowlist. Ne lève jamais : toute erreur (nom inconnu
 * ou échec de validation/exécution de l'executor) est convertie en résultat
 * is_error porteur d'un message clair pour le modèle.
 */
export async function runTool(name: string, input: unknown): Promise<ToolRunResult> {
  const entry = ALLOWLIST[name]
  if (!entry) {
    return { isError: true, content: `Tool non autorisé : "${name}".` }
  }
  try {
    const result = await entry.execute(input)
    return { isError: false, content: JSON.stringify(result) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { isError: true, content: message }
  }
}
