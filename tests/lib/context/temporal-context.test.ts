// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { formatTemporalContext, parisToday } from '../../../api/_lib/context/temporalContext'

describe('contexte temporel (Europe/Paris, FR)', () => {
  it('parisToday rend YYYY-MM-DD en fuseau Paris', () => {
    // 2026-06-05 09:00 UTC → 11:00 Paris, même jour
    expect(parisToday(new Date('2026-06-05T09:00:00Z'))).toBe('2026-06-05')
  })

  it('parisToday gère le décalage minuit UTC (22:30 UTC = lendemain 00:30 Paris en été)', () => {
    expect(parisToday(new Date('2026-06-05T22:30:00Z'))).toBe('2026-06-06')
  })

  it('formate la date FR avec jour de la semaine', () => {
    const out = formatTemporalContext(new Date('2026-06-05T10:00:00Z'))
    expect(out).toContain('vendredi 5 juin 2026')
  })

  it('après 18h Paris → suggère le check-out', () => {
    // 17:00 UTC = 19:00 Paris (été)
    const out = formatTemporalContext(new Date('2026-06-05T17:00:00Z'))
    expect(out).toMatch(/check-out/i)
  })

  it('avant 18h Paris → ne suggère pas le check-out', () => {
    // 10:00 UTC = 12:00 Paris
    const out = formatTemporalContext(new Date('2026-06-05T10:00:00Z'))
    expect(out).not.toMatch(/check-out/i)
  })
})
