// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { toSessionView, formatSessions, shortFrDate } from '../../../api/_lib/context/sessionsContext'

describe('contexte sessions', () => {
  it('toSessionView projette résumé/focus/date/type', () => {
    expect(
      toSessionView({ fields: { 'Résumé': 'Travail X', 'Focus du jour': 'Optimiser perf', 'Date': '2026-05-27T17:55:00.000Z', 'Type': 'Check-in' } }),
    ).toEqual({ resume: 'Travail X', focus: 'Optimiser perf', date: '2026-05-27T17:55:00.000Z', type: 'Check-in' })
  })

  it('formatSessions tronque les résumés longs', () => {
    const long = 'x'.repeat(500)
    const out = formatSessions([{ resume: long, date: '2026-05-27T17:55:00.000Z' }])
    expect(out.length).toBeLessThan(400)
    expect(out).toContain('…')
  })

  it('formatSessions affiche la date au format FR', () => {
    const out = formatSessions([{ resume: 'Court', date: '2026-05-27T17:55:00.000Z' }])
    expect(out).toContain('27/05/2026')
  })

  it('liste vide → mention explicite', () => {
    expect(formatSessions([])).toMatch(/aucune session/i)
  })

  it('shortFrDate rend JJ/MM', () => {
    expect(shortFrDate('2026-06-04T15:43:16.000Z')).toBe('04/06')
  })
})
