import { useQuery } from '@tanstack/react-query'
import { listRecords } from './airtable'
import {
  TABLES,
  type AirtableRecord,
  type ProjetFields,
  type TacheFields,
  type SousTacheFields,
} from './types'

/**
 * Radar Projets — mapping des champs Airtable (base appyvKVq6Q6kr37La).
 *
 * Source de vérité validée sur données live le 25/06/2026. Centralisé ici
 * pour que tout renommage de champ côté Airtable se corrige à un seul endroit.
 */
export const FIELD_MAP = {
  projets: {
    table: TABLES.Projets, // tbl58obVdHkmZU0T1
    nom: 'Nom du projet',
    statut: 'Statut',
    avancement: '% Avancement', // percent : 0.45 = 45 %
    client: 'Client', // singleSelect (pas un lien)
    type: 'Type',
    processus: 'Processus métier impacté',
    technos: 'Technos utilisées', // multipleSelects → string[]
    taches: 'Tâches', // multipleRecordLinks → record IDs
    description: 'Description',
    notes: 'Notes management',
    dateDebut: 'Date de début',
  },
  taches: {
    table: TABLES.Taches, // tblCeCMPP29NDcSGX
    titre: 'Titre de la tâche',
    statut: 'Statut',
    priorite: 'Priorité',
    details: 'Description / Sous-tâches',
    bloquant: 'Bloquant', // checkbox
    sousTaches: 'Sous-tâches', // multipleRecordLinks → record IDs
    projetParent: 'Projet parent', // multipleRecordLinks → record IDs
    dateJour: 'Date du jour',
  },
  sousTaches: {
    table: TABLES.SousTaches, // tblIQErdHsyiTx5yL
    action: 'Action',
    fait: 'Fait', // checkbox
    notes: 'Notes',
    tacheParente: 'Tâche parente', // multipleRecordLinks → record IDs
  },
} as const

// Le champ Statut des projets porte deux libellés « en cours » (un doublon
// historique sans emoji). On considère les deux comme actifs.
const PROJET_EN_COURS = ['🏗️ En cours', 'En cours']
// Statut terminal des tâches (valeur exacte du singleSelect, emoji compris).
const TACHE_TERMINEE = '✅ Terminé'
// Une tâche ouverte depuis plus de N jours est traitée comme potentiellement bloquée.
const BLOCKED_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000
const FIVE_MIN = 5 * 60 * 1000

// ── Types métier exposés à l'UI ─────────────────────────────────────────
export type RadarSubtask = {
  id: string
  action: string
  fait: boolean
}

export type RadarTask = {
  id: string
  titre: string
  statut: string
  priorite: string
  details: string
  bloquant: boolean
  createdTime: string | null
  ageDays: number | null
  isBlocked: boolean
  subtasks: RadarSubtask[]
}

export type RadarProject = {
  id: string
  nom: string
  client: string
  statut: string
  avancementPct: number
  themes: string[]
  tasks: RadarTask[]
  nextTask: RadarTask | null
  isBlocked: boolean
}

// Poids de priorité pour choisir la « prochaine tâche » (plus petit = plus urgent).
// Match par sous-chaîne pour absorber les variantes emoji / sans emoji.
function priorityWeight(priorite: string): number {
  const p = priorite.toLowerCase()
  if (p.includes('haute')) return 0
  if (p.includes('moyenne')) return 1
  if (p.includes('basse')) return 2
  if (p.includes('long terme')) return 3
  return 2
}

function ageInDays(createdTime: string | null): number | null {
  if (!createdTime) return null
  const t = Date.parse(createdTime)
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / MS_PER_DAY)
}

// Thèmes majeurs : on combine Type + Processus métier + Technos, on déduplique
// et on garde les 3 premiers axes non vides.
function buildThemes(f: ProjetFields): string[] {
  const out: string[] = []
  const push = (v?: string) => {
    if (v && !out.includes(v)) out.push(v)
  }
  push(f[FIELD_MAP.projets.type] as string | undefined)
  push(f[FIELD_MAP.projets.processus] as string | undefined)
  const technos = (f[FIELD_MAP.projets.technos] as string[] | undefined) ?? []
  for (const t of technos) push(t)
  return out.slice(0, 3)
}

// ── Queries react-query (lecture via le proxy Vercel /api/airtable) ──────
function useRadarProjectsRaw() {
  const formula = `OR(${PROJET_EN_COURS.map((s) => `{Statut}="${s}"`).join(',')})`
  return useQuery<AirtableRecord<ProjetFields>[]>({
    queryKey: ['radar', 'projets', 'en-cours'],
    queryFn: () =>
      listRecords<ProjetFields>(FIELD_MAP.projets.table, {
        filterByFormula: formula,
        sort: [{ field: FIELD_MAP.projets.avancement, direction: 'desc' }],
        maxRecords: 50,
      }),
    staleTime: FIVE_MIN,
  })
}

function useRadarTasksRaw() {
  return useQuery<AirtableRecord<TacheFields>[]>({
    queryKey: ['radar', 'taches', 'ouvertes'],
    queryFn: () =>
      listRecords<TacheFields>(FIELD_MAP.taches.table, {
        filterByFormula: `{Statut}!="${TACHE_TERMINEE}"`,
        maxRecords: 200,
      }),
    staleTime: FIVE_MIN,
  })
}

function useRadarSubtasksRaw() {
  return useQuery<AirtableRecord<SousTacheFields>[]>({
    queryKey: ['radar', 'sous-taches'],
    queryFn: () =>
      listRecords<SousTacheFields>(FIELD_MAP.sousTaches.table, {
        maxRecords: 500,
      }),
    staleTime: FIVE_MIN,
  })
}

/**
 * Hook composite : projets « En cours », leurs tâches ouvertes et sous-tâches,
 * assemblés côté client (Airtable renvoie les liens sous forme de record IDs).
 * Tri des projets par % d'avancement décroissant.
 */
export function useRadar() {
  const projectsQ = useRadarProjectsRaw()
  const tasksQ = useRadarTasksRaw()
  const subtasksQ = useRadarSubtasksRaw()

  const isLoading = projectsQ.isLoading || tasksQ.isLoading || subtasksQ.isLoading
  const error = projectsQ.error ?? tasksQ.error ?? subtasksQ.error ?? null

  const projects: RadarProject[] = (() => {
    if (!projectsQ.data) return []
    const tasks = tasksQ.data ?? []
    const subtasks = subtasksQ.data ?? []

    // Index sous-tâches par tâche parente.
    const subsByTask = new Map<string, RadarSubtask[]>()
    for (const s of subtasks) {
      const parents = s.fields[FIELD_MAP.sousTaches.tacheParente] ?? []
      const sub: RadarSubtask = {
        id: s.id,
        action: s.fields[FIELD_MAP.sousTaches.action] ?? '—',
        fait: Boolean(s.fields[FIELD_MAP.sousTaches.fait]),
      }
      for (const taskId of parents) {
        const arr = subsByTask.get(taskId) ?? []
        arr.push(sub)
        subsByTask.set(taskId, arr)
      }
    }

    // Index tâches (mappées) par projet parent.
    const tasksByProject = new Map<string, RadarTask[]>()
    for (const t of tasks) {
      const createdTime = t.createdTime ?? null
      const ageDays = ageInDays(createdTime)
      const bloquant = Boolean(t.fields[FIELD_MAP.taches.bloquant])
      const mapped: RadarTask = {
        id: t.id,
        titre: t.fields[FIELD_MAP.taches.titre] ?? '—',
        statut: t.fields[FIELD_MAP.taches.statut] ?? '',
        priorite: t.fields[FIELD_MAP.taches.priorite] ?? '',
        details: t.fields[FIELD_MAP.taches.details] ?? '',
        bloquant,
        createdTime,
        ageDays,
        isBlocked: bloquant || (ageDays !== null && ageDays > BLOCKED_DAYS),
        subtasks: subsByTask.get(t.id) ?? [],
      }
      const parents = t.fields[FIELD_MAP.taches.projetParent] ?? []
      for (const projId of parents) {
        const arr = tasksByProject.get(projId) ?? []
        arr.push(mapped)
        tasksByProject.set(projId, arr)
      }
    }

    return projectsQ.data.map((p) => {
      const projTasks = tasksByProject.get(p.id) ?? []
      // « Prochaine tâche » : priorité la plus haute, puis la plus ancienne.
      const sorted = [...projTasks].sort((a, b) => {
        const w = priorityWeight(a.priorite) - priorityWeight(b.priorite)
        if (w !== 0) return w
        return (Date.parse(a.createdTime ?? '') || 0) - (Date.parse(b.createdTime ?? '') || 0)
      })
      const avancement = p.fields[FIELD_MAP.projets.avancement] ?? 0
      return {
        id: p.id,
        nom: p.fields[FIELD_MAP.projets.nom] ?? '—',
        client: (p.fields[FIELD_MAP.projets.client] as string | undefined) ?? 'Interne',
        statut: p.fields[FIELD_MAP.projets.statut] ?? '',
        avancementPct: Math.round(avancement * 100),
        themes: buildThemes(p.fields),
        tasks: sorted,
        nextTask: sorted[0] ?? null,
        isBlocked: projTasks.some((t) => t.isBlocked),
      }
    })
  })()

  return {
    projects,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      void projectsQ.refetch()
      void tasksQ.refetch()
      void subtasksQ.refetch()
    },
  }
}
