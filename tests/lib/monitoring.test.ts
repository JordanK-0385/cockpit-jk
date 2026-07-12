import { describe, it, expect } from 'vitest'
import { FILTERS, filterCounts, filterWorkflows, type FilterKey } from '@/components/monitoring/filters'
import type { N8nWorkflowSummary } from '@/lib/n8n-types'
import { priceForModel } from '../../api/_lib/n8n-config'

function wf(over: Partial<N8nWorkflowSummary>): N8nWorkflowSummary {
  return {
    id: 'w',
    name: 'W',
    active: true,
    status: 'success',
    triggerType: 'webhook',
    lastRunAt: null,
    lastError: null,
    exec24h: 0,
    successRate24h: 1,
    avgDurationMs: null,
    client: 'John Dalia',
    updatedAt: null,
    execThisWeek: 0,
    execThisMonth: 0,
    notImproved: false,
    tokensIn: null,
    tokensOut: null,
    cost30d: null,
    model: null,
    costAvailable: false,
    silent: null,
    expiringCredentials: [],
    ...over,
  }
}

describe('monitoring filters', () => {
  const list: N8nWorkflowSummary[] = [
    wf({ id: 'a', status: 'success', execThisWeek: 3, execThisMonth: 10 }),
    wf({ id: 'b', status: 'error', execThisWeek: 0, execThisMonth: 0, notImproved: true }),
    wf({ id: 'c', status: 'success', silent: true, execThisWeek: 1, execThisMonth: 4 }),
    wf({ id: 'd', status: 'paused', expiringCredentials: [{ label: 'Meta', date: '2026-07-20', daysLeft: 8 }] }),
  ]

  it('a un prédicat par clé de filtre', () => {
    const keys = FILTERS.map((f) => f.key)
    expect(keys).toContain('active-week')
    expect(keys).toContain('credential')
  })

  it('filtre « active-week » = execThisWeek ≥ 1', () => {
    expect(filterWorkflows(list, 'active-week').map((w) => w.id)).toEqual(['a', 'c'])
  })

  it('filtre « inactive-month » = execThisMonth = 0', () => {
    expect(filterWorkflows(list, 'inactive-month').map((w) => w.id)).toEqual(['b', 'd'])
  })

  it('filtre « error » / « silent » / « credential »', () => {
    expect(filterWorkflows(list, 'error').map((w) => w.id)).toEqual(['b'])
    expect(filterWorkflows(list, 'silent').map((w) => w.id)).toEqual(['c'])
    expect(filterWorkflows(list, 'credential').map((w) => w.id)).toEqual(['d'])
  })

  it('« Toutes » ne filtre rien et compte tout', () => {
    expect(filterWorkflows(list, 'all')).toHaveLength(4)
    const counts = filterCounts(list)
    expect(counts.all).toBe(4)
    expect(counts['not-improved']).toBe(1)
  })

  it('clé inconnue retombe sur « Toutes »', () => {
    expect(filterWorkflows(list, 'zzz' as FilterKey)).toHaveLength(4)
  })
})

describe('priceForModel', () => {
  it('résout les familles Anthropic', () => {
    expect(priceForModel('claude-opus-4-8')).toEqual({ in: 15, out: 75 })
    expect(priceForModel('claude-sonnet-4-5-20250929')).toEqual({ in: 3, out: 15 })
    expect(priceForModel('claude-haiku-4-5')).toEqual({ in: 1, out: 5 })
    expect(priceForModel('claude-3-5-haiku-20241022')).toEqual({ in: 0.8, out: 4 })
  })

  it('renvoie null pour un modèle inconnu ou vide', () => {
    expect(priceForModel('gpt-4o')).toBeNull()
    expect(priceForModel(null)).toBeNull()
    expect(priceForModel(undefined)).toBeNull()
  })
})
