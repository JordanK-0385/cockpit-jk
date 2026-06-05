import type { RawSession } from '../airtable.js'

export type SessionView = {
  resume?: string
  focus?: string
  date?: string
  type?: string
}

const MAX_RESUME = 280
const TZ = 'Europe/Paris'

export function toSessionView(r: { fields: RawSession }): SessionView {
  return {
    resume: r.fields['Résumé'],
    focus: r.fields['Focus du jour'],
    date: r.fields['Date'],
    type: r.fields['Type'],
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s
}

function frDate(iso?: string): string {
  if (!iso) return '(sans date)'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '(date invalide)'
    : new Intl.DateTimeFormat('fr-FR', { timeZone: TZ }).format(d)
}

// Date courte JJ/MM (pour étiqueter le focus de la dernière session).
export function shortFrDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '??/??'
    : new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(d)
}

export function formatSessions(sessions: SessionView[]): string {
  if (!sessions.length) return '## 3 dernières sessions\nAucune session enregistrée.'
  const blocks = sessions.map((s) => {
    const head = `### ${frDate(s.date)}${s.type ? ` — ${s.type}` : ''}`
    const resume = s.resume ? truncate(s.resume, MAX_RESUME) : '(pas de résumé)'
    return `${head}\n${resume}`
  })
  return `## 3 dernières sessions\n${blocks.join('\n\n')}`
}
