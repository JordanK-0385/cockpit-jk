import { useProjects, useActiveTasks, useRecentSessions } from './queries'

/**
 * Board de l'Accueil — agrégation par CLIENT (décision produit : une carte
 * par client, pas par projet). Réutilise les hooks react-query existants
 * (aucune nouvelle requête réseau) et assemble côté client.
 *
 * Points de mapping assumés (voir PR) :
 *  - Les sessions n'ont pas de champ « Client » : on le dérive via
 *    `Projets concernés` → `Client` du projet.
 *  - « En attente de X » n'existe pas en base : on n'affiche que le NOMBRE de
 *    bloquants (pas de faux libellé « de qui »).
 *  - « Jours ce mois » n'est pas tracké : stub —/10 côté UI, pas ici.
 */

export type BoardTone = 'sage' | 'glacier' | 'terracotta' | 'neutral'
export type BoardClientKind = 'retainer' | 'client' | 'interne'

// Configuration par client. Les libellés doivent matcher le singleSelect
// « Client » de la table Projets ; le regroupement fonctionne quoi qu'il
// arrive (fallback ci-dessous), seuls le ton / type / compteur jours en
// dépendent. TODO: migrer cette table vers des tags/props Airtable.
const CLIENT_CONFIG: Record<string, { tone: BoardTone; kind: BoardClientKind }> = {
  'John Dalia': { tone: 'terracotta', kind: 'retainer' },
  '26 Academy': { tone: 'sage', kind: 'retainer' },
  'SRBL Capital': { tone: 'glacier', kind: 'client' },
  'Habad.ai': { tone: 'glacier', kind: 'client' },
  'JK Consulting': { tone: 'neutral', kind: 'interne' },
}
const FALLBACK = { tone: 'neutral' as BoardTone, kind: 'client' as BoardClientKind }

const KIND_LABEL: Record<BoardClientKind, string> = {
  retainer: 'Client retainer',
  client: 'Client',
  interne: 'Projet interne',
}

const NEGLECTED_DAYS = 10
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type BoardLastSession = {
  type: string
  summary: string
  url: string | null
  at: string | null
}

export type BoardClient = {
  client: string
  kind: BoardClientKind
  tone: BoardTone
  typeLabel: string
  isRetainer: boolean
  projectCount: number
  projectNames: string[]
  statut: string
  openTasks: number
  blockers: number
  lastActivityAt: string | null
  ageDays: number | null
  neglected: boolean
  lastSession: BoardLastSession | null
}

function configFor(client: string) {
  return CLIENT_CONFIG[client] ?? FALLBACK
}

function parseDate(v: unknown): number | null {
  if (typeof v !== 'string' || !v) return null
  const t = Date.parse(v)
  return Number.isNaN(t) ? null : t
}

function maxDate(a: number | null, b: number | null): number | null {
  if (a === null) return b
  if (b === null) return a
  return Math.max(a, b)
}

/**
 * Agrège projets / tâches / sessions par client. Tri : négligés d'abord
 * (les clients qu'on laisse de côté remontent), puis par activité récente.
 */
export function useBoard() {
  const projectsQ = useProjects()
  const tasksQ = useActiveTasks()
  const sessionsQ = useRecentSessions(30)

  const isLoading = projectsQ.isLoading || tasksQ.isLoading || sessionsQ.isLoading
  const error = (projectsQ.error ?? tasksQ.error ?? sessionsQ.error ?? null) as Error | null

  const projects = projectsQ.data ?? []
  const tasks = tasksQ.data ?? []
  const sessions = sessionsQ.data ?? []

  // projectId → client (pour rattacher tâches et sessions).
  const projectClient = new Map<string, string>()
  for (const p of projects) {
    projectClient.set(p.id, (p.fields.Client ?? 'JK Consulting').trim() || 'JK Consulting')
  }

  type Agg = {
    projectNames: string[]
    statuts: string[]
    openTasks: number
    blockers: number
    lastActivityAt: number | null
    lastSession: { at: number | null; raw: BoardLastSession } | null
  }
  const byClient = new Map<string, Agg>()
  const ensure = (client: string): Agg => {
    let a = byClient.get(client)
    if (!a) {
      a = { projectNames: [], statuts: [], openTasks: 0, blockers: 0, lastActivityAt: null, lastSession: null }
      byClient.set(client, a)
    }
    return a
  }

  // Projets → une entrée client par projet.
  for (const p of projects) {
    const client = (p.fields.Client ?? 'JK Consulting').trim() || 'JK Consulting'
    const a = ensure(client)
    a.projectNames.push(p.fields['Nom du projet'] ?? '—')
    if (p.fields.Statut) a.statuts.push(p.fields.Statut)
    a.lastActivityAt = maxDate(a.lastActivityAt, parseDate(p.fields['Date de début']))
  }

  // Tâches ouvertes → rattachées au client de leur projet parent.
  for (const t of tasks) {
    const parents = t.fields['Projet parent'] ?? []
    const clients = new Set<string>()
    for (const pid of parents) {
      const c = projectClient.get(pid)
      if (c) clients.add(c)
    }
    const taskDate = maxDate(
      maxDate(parseDate(t.fields['Date du jour']), parseDate(t.fields['Date cible'])),
      parseDate(t.createdTime),
    )
    for (const client of clients) {
      const a = ensure(client)
      a.openTasks++
      if (t.fields.Bloquant) a.blockers++
      a.lastActivityAt = maxDate(a.lastActivityAt, taskDate)
    }
  }

  // Sessions → client dérivé des projets concernés ; garde la plus récente.
  for (const s of sessions) {
    const linked = s.fields['Projets concernés'] ?? []
    const clients = new Set<string>()
    for (const pid of linked) {
      const c = projectClient.get(pid)
      if (c) clients.add(c)
    }
    if (clients.size === 0) continue
    const at = maxDate(parseDate(s.fields.Date), parseDate(s.createdTime))
    for (const client of clients) {
      const a = ensure(client)
      a.lastActivityAt = maxDate(a.lastActivityAt, at)
      if (!a.lastSession || (at ?? 0) > (a.lastSession.at ?? 0)) {
        a.lastSession = {
          at,
          raw: {
            type: s.fields.Type ?? 'Session',
            summary: s.fields['Résumé'] ?? '',
            url: s.fields['URL conversation'] ?? null,
            at: s.fields.Date ?? null,
          },
        }
      }
    }
  }

  const now = Date.now()
  const clients: BoardClient[] = [...byClient.entries()].map(([client, a]) => {
    const cfg = configFor(client)
    const ageDays =
      a.lastActivityAt !== null ? Math.floor((now - a.lastActivityAt) / MS_PER_DAY) : null
    const statut = a.statuts.find((s) => s.includes('En cours')) ?? a.statuts[0] ?? '—'
    return {
      client,
      kind: cfg.kind,
      tone: cfg.tone,
      typeLabel: KIND_LABEL[cfg.kind],
      isRetainer: cfg.kind === 'retainer',
      projectCount: a.projectNames.length,
      projectNames: a.projectNames,
      statut,
      openTasks: a.openTasks,
      blockers: a.blockers,
      lastActivityAt: a.lastActivityAt !== null ? new Date(a.lastActivityAt).toISOString() : null,
      ageDays,
      neglected: ageDays !== null && ageDays > NEGLECTED_DAYS,
      lastSession: a.lastSession?.raw ?? null,
    }
  })

  // Négligés d'abord (âge décroissant), puis les plus actifs.
  clients.sort((x, y) => {
    if (x.neglected !== y.neglected) return x.neglected ? -1 : 1
    return (y.lastActivityAt ? Date.parse(y.lastActivityAt) : 0) -
      (x.lastActivityAt ? Date.parse(x.lastActivityAt) : 0)
  })

  // Reprise globale : la session la plus récente tous axes confondus.
  const resume: BoardLastSession | null = (() => {
    let best: { at: number; raw: BoardLastSession } | null = null
    for (const s of sessions) {
      const at = parseDate(s.fields.Date) ?? parseDate(s.createdTime)
      if (at === null) continue
      if (!best || at > best.at) {
        best = {
          at,
          raw: {
            type: s.fields.Type ?? 'Session',
            summary: s.fields['Résumé'] ?? '',
            url: s.fields['URL conversation'] ?? null,
            at: s.fields.Date ?? null,
          },
        }
      }
    }
    return best?.raw ?? null
  })()

  return { clients, resume, isLoading, error }
}
