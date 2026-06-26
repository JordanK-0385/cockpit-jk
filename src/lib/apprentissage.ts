import { useQuery } from '@tanstack/react-query'
import { listRecords } from './airtable'
import { TABLES, type AirtableRecord, type SujetApprentissageFields } from './types'

/**
 * Module Apprendre — mapping de la table « Sujets d'apprentissage »
 * (base appyvKVq6Q6kr37La, tblENjeR9J2XuBUZq). Source de vérité des thèmes :
 * un renommage de champ côté Airtable se corrige ici uniquement.
 */
export const SUJETS_FIELD_MAP = {
  table: TABLES.Sujets,
  theme: 'Thème',
  domaine: 'Domaine',
  niveau: 'Niveau',
  angle: 'Angle pédagogique',
  source: 'Source',
  referentiels: 'Référentiels',
  priorite: 'Priorité',
  statut: 'Statut',
  ordre: 'Ordre',
} as const

export type Sujet = {
  id: string
  theme: string
  domaine: string
  niveau: string
  angle: string
  source: string
  referentiels: string[]
  priorite: string
  ordre: number
}

const FIVE_MIN = 5 * 60 * 1000

/** Hook : sujets « Actif » de la table, triés par priorité décroissante. */
export function useSujets() {
  const q = useQuery<AirtableRecord<SujetApprentissageFields>[]>({
    queryKey: ['apprentissage', 'sujets', 'actifs'],
    queryFn: () =>
      listRecords<SujetApprentissageFields>(SUJETS_FIELD_MAP.table, {
        filterByFormula: `{Statut}="Actif"`,
        maxRecords: 200,
      }),
    staleTime: FIVE_MIN,
  })

  const sujets: Sujet[] = (q.data ?? [])
    .map((r) => ({
      id: r.id,
      theme: r.fields[SUJETS_FIELD_MAP.theme] ?? '—',
      domaine: r.fields[SUJETS_FIELD_MAP.domaine] ?? '',
      niveau: r.fields[SUJETS_FIELD_MAP.niveau] ?? 'Intermédiaire',
      angle: r.fields[SUJETS_FIELD_MAP.angle] ?? '',
      source: r.fields[SUJETS_FIELD_MAP.source] ?? '',
      referentiels: r.fields[SUJETS_FIELD_MAP.referentiels] ?? [],
      priorite: r.fields[SUJETS_FIELD_MAP.priorite] ?? '',
      ordre: r.fields[SUJETS_FIELD_MAP.ordre] ?? 0,
    }))
    .sort((a, b) => a.ordre - b.ordre)

  return {
    sujets,
    isLoading: q.isLoading,
    error: q.error as Error | null,
    refetch: () => void q.refetch(),
  }
}
