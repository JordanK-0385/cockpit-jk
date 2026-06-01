// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildQuery, type AirtableQuery } from '../../api/_lib/airtable'

function parse(qs: string): URLSearchParams {
  return new URLSearchParams(qs)
}

describe('buildQuery — AirtableQuery → URL query string', () => {
  it('returns an empty string for an empty query', () => {
    expect(buildQuery({})).toBe('')
  })

  it('maps a known business query to the expected Airtable params', () => {
    const q: AirtableQuery = {
      filterByFormula: "{Status}='Open'",
      maxRecords: 50,
      pageSize: 10,
      view: 'Grid view',
      sort: [
        { field: 'Priority', direction: 'desc' },
        { field: 'Name' },
      ],
      fields: ['Name', 'Status'],
    }

    const params = parse(buildQuery(q))

    expect(params.get('filterByFormula')).toBe("{Status}='Open'")
    expect(params.get('maxRecords')).toBe('50')
    expect(params.get('pageSize')).toBe('10')
    expect(params.get('view')).toBe('Grid view')

    expect(params.get('sort[0][field]')).toBe('Priority')
    expect(params.get('sort[0][direction]')).toBe('desc')
    expect(params.get('sort[1][field]')).toBe('Name')
    expect(params.get('sort[1][direction]')).toBeNull()

    expect(params.getAll('fields[]')).toEqual(['Name', 'Status'])
  })

  it('omits keys that were not provided', () => {
    const params = parse(buildQuery({ maxRecords: 5 }))
    expect(params.get('maxRecords')).toBe('5')
    expect(params.get('filterByFormula')).toBeNull()
    expect(params.get('view')).toBeNull()
    expect(params.get('pageSize')).toBeNull()
  })
})
