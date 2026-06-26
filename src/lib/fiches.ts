import { useQuery } from '@tanstack/react-query'
import { listRecords, createRecord } from './airtable'
import { TABLES, type AirtableRecord, type FicheFields } from './types'
import type { GlossaryItem } from './quiz'

/**
 * Module Apprendre — table « Fiches d'apprentissage » (tblbM6blz1zWiyEWt) :
 * la Trace durable produite en fin de quiz, relue dans la vue « Mes fiches ».
 */

export type Fiche = {
  id: string
  titre: string
  sujet: string
  domaine: string
  date: string
  niveau: string
  score: string
  pourcentage: number
  enseignements: string
  glossaire: string
  trace: string
}

export type NewFiche = {
  sujet: string
  domaine: string
  niveau: string
  score: number
  total: number
  pct: number
  enseignements: string[]
  glossaire: GlossaryItem[]
  trace: string
}

const FIVE_MIN = 5 * 60 * 1000

/** Formate une date ISO courte en JJ/MM/AAAA pour le titre. */
function frDate(d: Date): string {
  return d.toLocaleDateString('fr-FR')
}

/** Compose les champs Airtable d'une nouvelle fiche. */
export function buildFicheFields(f: NewFiche, now = new Date()): FicheFields {
  const ens = f.enseignements.map((e) => `• ${e}`).join('\n')
  const glo = f.glossaire.map((g) => `${g.terme} : ${g.definition}`).join('\n')
  return {
    Titre: `${f.sujet} — ${frDate(now)}`,
    Sujet: f.sujet,
    Domaine: f.domaine,
    Date: now.toISOString().slice(0, 10),
    Niveau: f.niveau,
    Score: `${f.score}/${f.total}`,
    Pourcentage: f.pct,
    Enseignements: ens,
    Glossaire: glo,
    Trace: f.trace,
    Source: 'Module Apprendre',
  }
}

export async function createFiche(f: NewFiche): Promise<void> {
  await createRecord<FicheFields>(TABLES.Fiches, buildFicheFields(f))
}

/** Hook : fiches existantes, triées par date décroissante. */
export function useFiches() {
  const q = useQuery<AirtableRecord<FicheFields>[]>({
    queryKey: ['apprentissage', 'fiches'],
    queryFn: () =>
      listRecords<FicheFields>(TABLES.Fiches, {
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 200,
      }),
    staleTime: FIVE_MIN,
  })

  const fiches: Fiche[] = (q.data ?? []).map((r) => ({
    id: r.id,
    titre: r.fields.Titre ?? '—',
    sujet: r.fields.Sujet ?? '',
    domaine: r.fields.Domaine ?? '',
    date: r.fields.Date ?? '',
    niveau: r.fields.Niveau ?? '',
    score: r.fields.Score ?? '',
    pourcentage: r.fields.Pourcentage ?? 0,
    enseignements: r.fields.Enseignements ?? '',
    glossaire: r.fields.Glossaire ?? '',
    trace: r.fields.Trace ?? '',
  }))

  return {
    fiches,
    isLoading: q.isLoading,
    error: q.error as Error | null,
    refetch: () => void q.refetch(),
  }
}
