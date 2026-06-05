const BASE = 'https://api.airtable.com/v0'

type AirtableRecord<F = Record<string, unknown>> = {
  id: string
  fields: F
  createdTime?: string
}

type ListResponse<F> = {
  records: AirtableRecord<F>[]
  offset?: string
}

export type AirtableQuery = {
  filterByFormula?: string
  sort?: { field: string; direction?: 'asc' | 'desc' }[]
  maxRecords?: number
  pageSize?: number
  view?: string
  fields?: string[]
}

export function buildQuery(q: AirtableQuery): string {
  const params = new URLSearchParams()
  if (q.filterByFormula) params.set('filterByFormula', q.filterByFormula)
  if (q.maxRecords) params.set('maxRecords', String(q.maxRecords))
  if (q.pageSize) params.set('pageSize', String(q.pageSize))
  if (q.view) params.set('view', q.view)
  q.sort?.forEach((s, i) => {
    params.set(`sort[${i}][field]`, s.field)
    if (s.direction) params.set(`sort[${i}][direction]`, s.direction)
  })
  q.fields?.forEach((f) => params.append('fields[]', f))
  return params.toString()
}

function ensureCreds() {
  const pat = process.env.AIRTABLE_PAT
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!pat || !baseId) {
    throw new Error('AIRTABLE_PAT or AIRTABLE_BASE_ID not set')
  }
  return { pat, baseId }
}

export async function airtableList<F = Record<string, unknown>>(
  table: string,
  query: AirtableQuery = {},
): Promise<ListResponse<F>> {
  const { pat, baseId } = ensureCreds()
  const qs = buildQuery(query)
  const url = `${BASE}/${baseId}/${encodeURIComponent(table)}${qs ? `?${qs}` : ''}`
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${pat}` },
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Airtable ${r.status}: ${text}`)
  }
  return (await r.json()) as ListResponse<F>
}

export async function airtableCreate<F = Record<string, unknown>>(
  table: string,
  fieldsList: F[],
): Promise<{ records: AirtableRecord<F>[] }> {
  const { pat, baseId } = ensureCreds()
  const url = `${BASE}/${baseId}/${encodeURIComponent(table)}`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: fieldsList.map((fields) => ({ fields })),
    }),
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Airtable ${r.status}: ${text}`)
  }
  return (await r.json()) as { records: AirtableRecord<F>[] }
}

export async function airtableUpdate<F = Record<string, unknown>>(
  table: string,
  records: { id: string; fields: Partial<F> }[],
): Promise<{ records: AirtableRecord<F>[] }> {
  const { pat, baseId } = ensureCreds()
  const url = `${BASE}/${baseId}/${encodeURIComponent(table)}`
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records }),
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Airtable ${r.status}: ${text}`)
  }
  return (await r.json()) as { records: AirtableRecord<F>[] }
}

// ── Lectures de contexte (Sprint 2, étape 4) ────────────────────────────
// Noms de tables/champs = schéma réel de la base appyvKVq6Q6kr37La.
// Statuts terminaux/Terminé portent leur emoji (valeur exacte du singleSelect).

export const PROJECTS_TABLE = 'Projets IA & Automatisation'
export const TASKS_TABLE = 'Tâches'
export const SESSIONS_TABLE = 'Sessions Claude'

export function activeProjectsQuery(): AirtableQuery {
  return {
    fields: ['Nom du projet', 'Statut', '% Avancement', 'Priorité', 'Date cible'],
    filterByFormula:
      'AND({Statut}!="📋 Backlog",{Statut}!="✅ Stable",{Statut}!="⏸️ En pause")',
    sort: [{ field: '% Avancement', direction: 'desc' }],
    maxRecords: 5,
  }
}

export function todayTasksQuery(todayISO: string): AirtableQuery {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayISO)) {
    throw new Error(`todayTasksQuery: todayISO doit être au format YYYY-MM-DD, reçu: ${todayISO}`)
  }
  return {
    fields: ['Titre de la tâche', 'Statut', 'Priorité', 'Date cible'],
    filterByFormula: `AND({Statut}!="✅ Terminé",IS_SAME({Date cible},"${todayISO}",'day'))`,
    maxRecords: 20,
  }
}

export function openBlockersQuery(): AirtableQuery {
  return {
    fields: ['Titre de la tâche', 'Statut', 'Priorité'],
    filterByFormula: 'AND({Bloquant}=1,{Statut}!="✅ Terminé")',
    maxRecords: 10,
  }
}

export function recentSessionsQuery(n: number): AirtableQuery {
  if (n < 1) throw new Error(`recentSessionsQuery: n doit être ≥ 1, reçu: ${n}`)
  return {
    fields: ['Résumé', 'Focus du jour', 'Date', 'Type'],
    sort: [{ field: 'Date', direction: 'desc' }],
    maxRecords: n,
  }
}
