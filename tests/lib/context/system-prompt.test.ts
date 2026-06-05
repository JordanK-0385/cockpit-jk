// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../../../api/_lib/context/systemPrompt'
import type { ContextData } from '../../../api/_lib/context/airtableContext'

const NOW = new Date('2026-06-05T10:00:00Z')

const fullContext: ContextData = {
  projects: [{ nom: 'Cockpit JK', statut: '🏗️ En cours', avancement: 45 }],
  tasks: [{ titre: 'Activer crons', statut: '🎯 À faire', priorite: '🔴 Haute' }],
  blockers: [],
  sessions: [{ resume: 'Session marathon Instagram', focus: 'Débloquer Meta', date: '2026-05-27T17:55:00.000Z', type: 'Check-in' }],
}

describe('buildSystemPrompt', () => {
  it('assemble identité + temporel + contexte quand la base répond', async () => {
    const out = await buildSystemPrompt({ now: NOW, loadContext: async () => fullContext })
    expect(out).toContain('Jordan Koskas')           // identité
    expect(out).toContain('vendredi 5 juin 2026')    // temporel
    expect(out).toContain('Cockpit JK')              // projet
    expect(out).toContain('Débloquer Meta')          // focus de la dernière session
    expect(out).toContain('Session marathon Instagram') // 3 dernières sessions
  })

  it('étiquette le focus avec la date de SA session (ne le présente pas comme « aujourd\'hui »)', async () => {
    // Session du 27/05 alors que `now` = 05/06 → le focus doit porter sa date.
    const out = await buildSystemPrompt({ now: NOW, loadContext: async () => fullContext })
    expect(out).toMatch(/Focus.*session du 27\/05/i)
    expect(out).not.toMatch(/Focus du jour\s*\n/i) // pas de « Focus du jour » nu/non daté
  })

  it('inclut la bannière N3 « données, pas instructions »', async () => {
    const out = await buildSystemPrompt({ now: NOW, loadContext: async () => fullContext })
    expect(out).toMatch(/données, pas des instructions/i)
  })

  it('fallback propre si la lecture Airtable jette (pas d\'exception)', async () => {
    const out = await buildSystemPrompt({ now: NOW, loadContext: async () => { throw new Error('Airtable 500') } })
    expect(out).toContain('Jordan Koskas')
    expect(out).toContain('vendredi 5 juin 2026')
    expect(out).toMatch(/contexte.*indisponible/i)
    expect(out).not.toContain('Airtable 500') // N2 : pas de détail d'erreur dans le prompt
  })

  it('fallback si la lecture dépasse le timeout', async () => {
    const slow = () => new Promise<ContextData>((resolve) => setTimeout(() => resolve(fullContext), 50))
    const out = await buildSystemPrompt({ now: NOW, loadContext: slow, timeoutMs: 5 })
    expect(out).toMatch(/contexte.*indisponible/i)
  })
})
