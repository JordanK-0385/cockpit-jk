import type { TacheFields, ProjetFields, SessionFields } from './types'

/**
 * Sprint 2 — Étape 7 : suggestions proactives.
 *
 * Puces DÉTERMINISTES dérivées des données DÉJÀ EN CACHE côté front (hooks
 * react-query). Fonction pure, sans réseau ni LLM ni firebase : tout le reste
 * (affichage, envoi) est branché dans ColumnCenter. Les suggestions sont des
 * artefacts UI — jamais persistées, jamais envoyées à l'API.
 */

export type SuggestionInput = {
  tasks: TacheFields[]
  projects: ProjetFields[]
  sessions: SessionFields[]
}

const TASKS_LINE = 'Fais-moi le point sur mes tâches actives'
const BLOCK_LINE = "Qu'est-ce qui bloque en ce moment ?"
const SESSIONS_LINE = 'Récap de mes 3 dernières sessions'

// Fallback générique quand il n'y a aucune donnée à exploiter.
const FALLBACK = ["Qu'est-ce que je fais aujourd'hui ?", 'Récap de mes dernières sessions']

const MAX_SUGGESTIONS = 4

// Projet « le plus avancé » = % Avancement le plus élevé (undefined = 0).
// Le premier gagne en cas d'égalité (réduction stable).
function mostAdvanced(projects: ProjetFields[]): ProjetFields {
  return projects.reduce((best, p) =>
    (p['% Avancement'] ?? 0) > (best['% Avancement'] ?? 0) ? p : best,
  )
}

export function buildSuggestions({ tasks, projects, sessions }: SuggestionInput): string[] {
  const out: string[] = []

  if (tasks.length > 0) out.push(TASKS_LINE)
  if (tasks.some((t) => t.Bloquant === true)) out.push(BLOCK_LINE)
  if (projects.length > 0) out.push(`Où en est ${mostAdvanced(projects)['Nom du projet']} ?`)

  // « Toujours en dernier » — dès qu'il existe la moindre donnée de contexte.
  const hasData = tasks.length > 0 || projects.length > 0 || sessions.length > 0
  if (hasData) out.push(SESSIONS_LINE)

  // Plancher : on garantit 2 à 4 éléments. Un contexte vide (ou réduit à une
  // seule puce) retombe sur le fallback générique.
  if (out.length < 2) return [...FALLBACK]
  return out.slice(0, MAX_SUGGESTIONS)
}
