import type Anthropic from '@anthropic-ai/sdk'
import { airtableCreate } from '../airtable.js'

/**
 * Sprint 2 — Étape 5 : unique tool d'écriture exposé au modèle.
 *
 * Sécurité by design (Protocole JK N4/N5) :
 *   - la table est HARDCODÉE ('Tâches') — le modèle ne la choisit jamais ;
 *   - chaque champ est validé côté backend avant tout appel réseau ;
 *   - toute valeur invalide lève une erreur AVANT airtableCreate (aucune
 *     écriture partielle), le message remontant au modèle comme tool_result
 *     is_error.
 */

// Valeurs exactes du singleSelect "Priorité" dans la base appyvKVq6Q6kr37La.
export const PRIORITES = ['🔴 Haute', '🟠 Moyenne', '🟢 Basse'] as const
export type Priorite = (typeof PRIORITES)[number]

// Table d'écriture — figée, jamais dérivée de l'input modèle.
const TASKS_TABLE = 'Tâches'
// Statut initial forcé sur toute tâche créée par le chat.
const STATUT_A_FAIRE = '🎯 À faire'

const MAX_TITRE = 200
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const createTaskTool: Anthropic.Tool = {
  name: 'create_task',
  description:
    "Crée une nouvelle tâche dans le cockpit de Jordan (table Tâches Airtable). " +
    "À utiliser quand Jordan demande explicitement d'ajouter / créer / noter une tâche. " +
    "La tâche est créée avec le statut « À faire ». Ne gère ni la modification ni la suppression.",
  input_schema: {
    type: 'object',
    properties: {
      titre: {
        type: 'string',
        description: 'Intitulé de la tâche (obligatoire, max 200 caractères).',
      },
      priorite: {
        type: 'string',
        enum: [...PRIORITES],
        description: 'Priorité de la tâche (optionnel).',
      },
      date_cible: {
        type: 'string',
        description: 'Date cible au format YYYY-MM-DD (optionnel).',
      },
    },
    required: ['titre'],
  },
}

export type CreateTaskInput = {
  titre?: unknown
  priorite?: unknown
  date_cible?: unknown
}

export type CreateTaskResult = { ok: true; id: string; titre: string }

/**
 * Champs réels Airtable. Construit uniquement à partir de valeurs validées ;
 * les champs optionnels sont omis (jamais à vide) s'ils ne sont pas fournis.
 */
type TaskFields = {
  'Titre de la tâche': string
  'Statut': string
  'Priorité'?: string
  'Date cible'?: string
}

export async function executeCreateTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  // titre — requis, non vide après trim, borné.
  if (typeof input.titre !== 'string') {
    throw new Error('Le champ "titre" est requis et doit être une chaîne.')
  }
  const titre = input.titre.trim()
  if (titre.length === 0) {
    throw new Error('Le titre ne peut pas être vide.')
  }
  if (titre.length > MAX_TITRE) {
    throw new Error(`Le titre dépasse ${MAX_TITRE} caractères (${titre.length}).`)
  }

  const fields: TaskFields = {
    'Titre de la tâche': titre,
    'Statut': STATUT_A_FAIRE,
  }

  // priorite — optionnelle, mais si fournie elle doit appartenir à l'enum.
  if (input.priorite !== undefined && input.priorite !== null) {
    if (!PRIORITES.includes(input.priorite as Priorite)) {
      throw new Error(
        `Priorité invalide. Valeurs acceptées : ${PRIORITES.join(', ')}.`,
      )
    }
    fields['Priorité'] = input.priorite as Priorite
  }

  // date_cible — optionnelle, mais si fournie elle doit être YYYY-MM-DD.
  if (input.date_cible !== undefined && input.date_cible !== null) {
    if (typeof input.date_cible !== 'string' || !DATE_RE.test(input.date_cible)) {
      throw new Error('Date cible invalide. Format attendu : YYYY-MM-DD.')
    }
    fields['Date cible'] = input.date_cible
  }

  const { records } = await airtableCreate<TaskFields>(TASKS_TABLE, [fields])
  const id = records[0]?.id ?? ''
  return { ok: true, id, titre }
}
