import type Anthropic from '@anthropic-ai/sdk'
import { airtableList, airtableUpdate } from '../airtable.js'

/**
 * Sprint 2 — Étape 6 : 2e tool d'écriture, MODIFICATION du statut d'une tâche.
 *
 * Sécurité by design (Protocole JK N4/N5 — tool de modification) :
 *   - le modèle ne fournit JAMAIS d'identifiant de record : il passe le TITRE
 *     (tel qu'affiché dans le contexte) + le nouveau statut ;
 *   - le backend résout la tâche par titre et REFUSE d'écrire si la
 *     correspondance est ambiguë (0 ou >1 résultat) → fail-closed, jamais
 *     d'écriture sur inférence ;
 *   - table 'Tâches' HARDCODÉE, seul le champ Statut est modifiable, pas de delete.
 */

// Valeurs EXACTES du single-select "Statut" dans la base appyvKVq6Q6kr37La.
export const STATUTS = [
  '🎯 À faire',
  '🚧 En cours',
  '🔍 À valider',
  '⏸ Bloqué',
  '✅ Terminé',
  '📋 Backlog',
] as const
export type Statut = (typeof STATUTS)[number]

// Table d'écriture — figée, jamais dérivée de l'input modèle.
const TASKS_TABLE = 'Tâches'
const TITRE_FIELD = 'Titre de la tâche'
const STATUT_FIELD = 'Statut'

export const updateTaskStatusTool: Anthropic.Tool = {
  name: 'update_task_status',
  description:
    "Change le statut d'une tâche existante. À utiliser quand Jordan demande de " +
    "passer/marquer une tâche dans un autre statut. Ne crée ni ne supprime de tâche.",
  input_schema: {
    type: 'object',
    properties: {
      titre: {
        type: 'string',
        description: 'Titre exact de la tâche à modifier (tel qu’affiché dans le contexte).',
      },
      nouveau_statut: {
        type: 'string',
        enum: [...STATUTS],
        description: 'Nouveau statut à appliquer à la tâche.',
      },
    },
    required: ['titre', 'nouveau_statut'],
  },
}

export type UpdateTaskStatusInput = {
  titre?: unknown
  nouveau_statut?: unknown
}

export type UpdateTaskStatusResult = {
  ok: true
  id: string
  titre: string
  statut: Statut
}

type TaskFields = {
  'Titre de la tâche'?: string
  'Statut'?: string
}

/**
 * Échappe une valeur destinée à une chaîne entre guillemets doubles dans une
 * formule Airtable : on neutralise antislash puis guillemet double, pour qu'un
 * titre contenant des `"` ne casse pas (ni n'altère) le filtre.
 */
function escapeFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export async function executeUpdateTaskStatus(
  input: UpdateTaskStatusInput,
): Promise<UpdateTaskStatusResult> {
  // nouveau_statut — requis, doit appartenir à l'enum. Validé EN PREMIER : on
  // ne lance aucune recherche tant que la cible de statut est invalide.
  if (typeof input.nouveau_statut !== 'string' || !STATUTS.includes(input.nouveau_statut as Statut)) {
    throw new Error(`Statut invalide. Valeurs acceptées : ${STATUTS.join(', ')}.`)
  }
  const nouveau_statut = input.nouveau_statut as Statut

  // titre — requis, non vide après trim.
  if (typeof input.titre !== 'string') {
    throw new Error('Le champ "titre" est requis et doit être une chaîne.')
  }
  const titre = input.titre.trim()
  if (titre.length === 0) {
    throw new Error('Le titre ne peut pas être vide.')
  }

  // Résolution par titre exact. On ne récupère que les champs utiles.
  const { records } = await airtableList<TaskFields>(
    TASKS_TABLE,
    {
      filterByFormula: `{${TITRE_FIELD}} = "${escapeFormulaString(titre)}"`,
      fields: [TITRE_FIELD, STATUT_FIELD],
    },
    { scope: 'read' },
  )

  // Fail-closed : on n'écrit que sur une correspondance unique et non ambiguë.
  if (records.length === 0) {
    throw new Error(`Aucune tâche nommée « ${titre} ».`)
  }
  if (records.length > 1) {
    throw new Error(`Plusieurs tâches nommées « ${titre} » : précise laquelle.`)
  }

  const id = records[0].id
  await airtableUpdate<TaskFields>(TASKS_TABLE, [{ id, fields: { Statut: nouveau_statut } }])

  return { ok: true, id, titre, statut: nouveau_statut }
}
