import { useQuery } from '@tanstack/react-query'
import { listRecords } from './airtable'
import {
  TABLES,
  type AirtableRecord,
  type ProjetFields,
  type TacheFields,
  type SessionFields,
} from './types'

const FIVE_MIN = 5 * 60 * 1000

export function useProjects(filter?: string) {
  return useQuery<AirtableRecord<ProjetFields>[]>({
    queryKey: ['airtable', 'projets', filter ?? 'actifs'],
    queryFn: () =>
      listRecords<ProjetFields>(TABLES.Projets, {
        filterByFormula:
          filter ?? "AND({Statut} != '✅ Terminé', {Statut} != '⏸️ En pause')",
        sort: [{ field: 'Priorité', direction: 'asc' }],
        maxRecords: 50,
      }),
    staleTime: FIVE_MIN,
  })
}

export function useActiveTasks() {
  return useQuery<AirtableRecord<TacheFields>[]>({
    queryKey: ['airtable', 'taches', 'actives'],
    queryFn: () =>
      listRecords<TacheFields>(TABLES.Taches, {
        filterByFormula: "{Statut} != '✅ Terminé'",
        sort: [{ field: 'Priorité', direction: 'asc' }],
        maxRecords: 100,
      }),
    staleTime: FIVE_MIN,
  })
}

export function useTodaysFocus() {
  return useQuery<AirtableRecord<SessionFields> | null>({
    queryKey: ['airtable', 'sessions', 'today-focus'],
    queryFn: async () => {
      const records = await listRecords<SessionFields>(TABLES.Sessions, {
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 5,
      })
      // Find the most recent session that has a "Focus du jour" set
      return records.find((r) => r.fields['Focus du jour']) ?? null
    },
    staleTime: FIVE_MIN,
  })
}

export function useRecentSessions(limit = 5) {
  return useQuery<AirtableRecord<SessionFields>[]>({
    queryKey: ['airtable', 'sessions', 'recent', limit],
    queryFn: () =>
      listRecords<SessionFields>(TABLES.Sessions, {
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: limit,
      }),
    staleTime: FIVE_MIN,
  })
}
