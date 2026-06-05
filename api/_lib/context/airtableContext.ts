import {
  getActiveProjects,
  getTodayTasks,
  getOpenBlockers,
  getRecentSessions,
  type RawProject,
  type RawTask,
} from '../airtable.js'
import { parisToday } from './temporalContext.js'
import { toSessionView, type SessionView } from './sessionsContext.js'

export type ProjectView = {
  nom?: string
  statut?: string
  avancement?: number
}
export type TaskView = {
  titre?: string
  statut?: string
  priorite?: string
  echeance?: string
}
export type ContextData = {
  projects: ProjectView[]
  tasks: TaskView[]
  blockers: TaskView[]
  sessions: SessionView[]
}

export function toProjectView(r: { fields: RawProject }): ProjectView {
  const pct = r.fields['% Avancement']
  return {
    nom: r.fields['Nom du projet'],
    statut: r.fields['Statut'],
    avancement: typeof pct === 'number' ? Math.round(pct * 100) : undefined,
  }
}

export function toTaskView(r: { fields: RawTask }): TaskView {
  return {
    titre: r.fields['Titre de la tâche'],
    statut: r.fields['Statut'],
    priorite: r.fields['Priorité'],
    echeance: r.fields['Date cible'],
  }
}

function projectLine(p: ProjectView): string {
  const pct = p.avancement != null ? ` — ${p.avancement}%` : ''
  const statut = p.statut ? ` [${p.statut}]` : ''
  return `- ${p.nom ?? '(sans nom)'}${statut}${pct}`
}

function taskLine(t: TaskView): string {
  const prio = t.priorite ? ` (${t.priorite})` : ''
  const statut = t.statut ? ` — ${t.statut}` : ''
  return `- ${t.titre ?? '(sans titre)'}${prio}${statut}`
}

export function formatAirtableContext(data: ContextData): string {
  const projets = data.projects.length
    ? data.projects.map(projectLine).join('\n')
    : 'Aucun projet actif.'
  const taches = data.tasks.length
    ? data.tasks.map(taskLine).join('\n')
    : "Aucune tâche à échéance aujourd'hui."
  const bloquants = data.blockers.length
    ? data.blockers.map(taskLine).join('\n')
    : 'Aucun bloquant ouvert.'

  return [
    `## Projets actifs (base JK Consulting)\n${projets}`,
    `## Tâches du jour\n${taches}`,
    `## Bloquants ouverts\n${bloquants}`,
  ].join('\n\n')
}

export async function getAirtableContext(): Promise<ContextData> {
  const today = parisToday(new Date())
  const [projects, tasks, blockers, sessions] = await Promise.all([
    getActiveProjects(),
    getTodayTasks(today),
    getOpenBlockers(),
    getRecentSessions(3),
  ])
  return {
    projects: projects.records.map(toProjectView),
    tasks: tasks.records.map(toTaskView),
    blockers: blockers.records.map(toTaskView),
    sessions: sessions.records.map(toSessionView),
  }
}
