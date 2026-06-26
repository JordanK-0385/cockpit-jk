import { useQuery } from '@tanstack/react-query'
import { listRecords, createRecord } from './airtable'
import { TABLES, type AirtableRecord, type FicheFields } from './types'
import type { GlossaryItem, FicheSchema } from './quiz'

/**
 * Module Apprendre — table « Fiches d'apprentissage » (tblbM6blz1zWiyEWt) :
 * la Trace durable produite en fin de quiz, relue dans « Mes fiches ».
 */

export type FicheEnseignement = string
export type FicheGlossaire = { terme: string; definition: string }

export type Fiche = {
  id: string
  titre: string
  sujet: string
  domaine: string
  date: string
  niveau: string
  score: string
  pourcentage: number
  enseignements: FicheEnseignement[]
  glossaire: FicheGlossaire[]
  trace: string
  schema: FicheSchema | null
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
  schema: FicheSchema | null
}

const FIVE_MIN = 5 * 60 * 1000

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
    Schema: f.schema ? JSON.stringify(f.schema) : '',
    Source: 'Module Apprendre',
  }
}

export async function createFiche(f: NewFiche): Promise<void> {
  await createRecord<FicheFields>(TABLES.Fiches, buildFicheFields(f))
}

/** Re-parse le bloc « • item » stocké en tableau d'enseignements. */
export function parseEnseignements(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean)
}

/** Re-parse le bloc « terme : définition » en paires. */
export function parseGlossaire(raw: string): FicheGlossaire[] {
  const out: FicheGlossaire[] = []
  for (const line of raw.split('\n')) {
    const l = line.trim()
    if (!l) continue
    const idx = l.indexOf(' : ')
    if (idx === -1) {
      out.push({ terme: l, definition: '' })
    } else {
      out.push({ terme: l.slice(0, idx).trim(), definition: l.slice(idx + 3).trim() })
    }
  }
  return out
}

function parseSchema(raw: string): FicheSchema | null {
  if (!raw || !raw.trim()) return null
  try {
    const s = JSON.parse(raw) as FicheSchema
    if (s && Array.isArray(s.nodes) && s.nodes.length >= 2 && s.kind) return s
    return null
  } catch {
    return null
  }
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
    enseignements: parseEnseignements(r.fields.Enseignements ?? ''),
    glossaire: parseGlossaire(r.fields.Glossaire ?? ''),
    trace: r.fields.Trace ?? '',
    schema: parseSchema(r.fields.Schema ?? ''),
  }))

  return {
    fiches,
    isLoading: q.isLoading,
    error: q.error as Error | null,
    refetch: () => void q.refetch(),
  }
}
