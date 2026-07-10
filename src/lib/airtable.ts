import { getIdToken } from './firebase'
import type { AirtableRecord } from './types'

type ListResponse<F> = { records: AirtableRecord<F>[]; offset?: string }

export type AirtableListOptions = {
  filterByFormula?: string
  sort?: { field: string; direction?: 'asc' | 'desc' }[]
  maxRecords?: number
  pageSize?: number
  view?: string
}

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}

function buildSearch(table: string, opts: AirtableListOptions): string {
  const params = new URLSearchParams()
  params.set('table', table)
  if (opts.filterByFormula) params.set('filterByFormula', opts.filterByFormula)
  if (opts.maxRecords) params.set('maxRecords', String(opts.maxRecords))
  if (opts.pageSize) params.set('pageSize', String(opts.pageSize))
  if (opts.view) params.set('view', opts.view)
  opts.sort?.forEach((s, i) => {
    params.set(`sort[${i}][field]`, s.field)
    if (s.direction) params.set(`sort[${i}][direction]`, s.direction)
  })
  return params.toString()
}

export async function listRecords<F>(
  table: string,
  opts: AirtableListOptions = {},
): Promise<AirtableRecord<F>[]> {
  const r = await authedFetch(`/api/airtable/records?${buildSearch(table, opts)}`)
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Airtable list failed (${r.status}): ${text}`)
  }
  const data = (await r.json()) as ListResponse<F>
  return data.records
}

export async function createRecord<F>(
  table: string,
  fields: F,
): Promise<AirtableRecord<F>> {
  const r = await authedFetch(
    `/api/airtable/records?table=${encodeURIComponent(table)}`,
    { method: 'POST', body: JSON.stringify({ records: [{ fields }] }) },
  )
  if (!r.ok) throw new Error(`Airtable create failed (${r.status})`)
  const data = (await r.json()) as { records: AirtableRecord<F>[] }
  return data.records[0]
}

export async function updateRecord<F>(
  table: string,
  id: string,
  fields: Partial<F>,
): Promise<AirtableRecord<F>> {
  const r = await authedFetch(
    `/api/airtable/records?table=${encodeURIComponent(table)}`,
    { method: 'PATCH', body: JSON.stringify({ records: [{ id, fields }] }) },
  )
  if (!r.ok) throw new Error(`Airtable update failed (${r.status})`)
  const data = (await r.json()) as { records: AirtableRecord<F>[] }
  return data.records[0]
}
