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
