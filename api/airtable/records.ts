import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuthorizedUser, setNoStore } from '../_lib/auth'
import { airtableList, airtableCreate, airtableUpdate, type AirtableQuery } from '../_lib/airtable'

/**
 * Generic Airtable proxy.
 *
 *   GET    /api/airtable/records?table=<name>&filterByFormula=...&sort[0][field]=...
 *          → list (passthrough)
 *
 *   POST   /api/airtable/records?table=<name>
 *          body: { records: [{ fields: {...} }, ...] }
 *
 *   PATCH  /api/airtable/records?table=<name>
 *          body: { records: [{ id, fields }, ...] }
 *
 * Everything is gated on a verified Firebase ID token whose email
 * matches AUTHORIZED_EMAIL.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStore(res)
  const auth = await requireAuthorizedUser(req, res)
  if (!auth) return

  const table = (req.query.table as string | undefined)?.trim()
  if (!table) {
    res.status(400).json({ error: 'Missing ?table= parameter' })
    return
  }

  try {
    if (req.method === 'GET') {
      const q: AirtableQuery = {}
      if (typeof req.query.filterByFormula === 'string') q.filterByFormula = req.query.filterByFormula
      if (typeof req.query.maxRecords === 'string') q.maxRecords = parseInt(req.query.maxRecords)
      if (typeof req.query.pageSize === 'string') q.pageSize = parseInt(req.query.pageSize)
      if (typeof req.query.view === 'string') q.view = req.query.view

      // sort[0][field], sort[0][direction], sort[1][field], …
      const sort: { field: string; direction?: 'asc' | 'desc' }[] = []
      let i = 0
      while (true) {
        const f = req.query[`sort[${i}][field]`]
        if (typeof f !== 'string') break
        const d = req.query[`sort[${i}][direction]`]
        sort.push({ field: f, direction: d === 'desc' ? 'desc' : 'asc' })
        i++
      }
      if (sort.length) q.sort = sort

      const data = await airtableList(table, q)
      res.status(200).json(data)
      return
    }

    if (req.method === 'POST') {
      const body = req.body as { records?: { fields: Record<string, unknown> }[] }
      if (!body?.records?.length) {
        res.status(400).json({ error: 'Body must include { records: [...] }' })
        return
      }
      const data = await airtableCreate(table, body.records.map((r) => r.fields))
      res.status(200).json(data)
      return
    }

    if (req.method === 'PATCH') {
      const body = req.body as { records?: { id: string; fields: Record<string, unknown> }[] }
      if (!body?.records?.length) {
        res.status(400).json({ error: 'Body must include { records: [...] }' })
        return
      }
      const data = await airtableUpdate(table, body.records)
      res.status(200).json(data)
      return
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err) {
    res.status(502).json({ error: 'Airtable upstream error', detail: String(err) })
  }
}
