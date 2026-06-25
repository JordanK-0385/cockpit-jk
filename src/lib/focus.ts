import { getIdToken } from './firebase'
import type { RadarProject } from './radar'

/** Payload compact envoyé au proxy : pas de blob inutile dans le prompt. */
export type FocusProjectInput = {
  projet: string
  client: string
  avancement: string
  taches: { titre: string; priorite: string; statut: string; bloque: boolean }[]
}

export function toFocusPayload(projects: RadarProject[]): FocusProjectInput[] {
  return projects.map((p) => ({
    projet: p.nom,
    client: p.client,
    avancement: `${p.avancementPct}%`,
    taches: p.tasks.slice(0, 6).map((t) => ({
      titre: t.titre,
      priorite: t.priorite,
      statut: t.statut,
      bloque: t.isBlocked,
    })),
  }))
}

/** Appelle /api/claude/focus (proxy Vercel). Retourne le texte des 3 priorités. */
export async function fetchFocusDuJour(projects: RadarProject[]): Promise<string> {
  const token = await getIdToken()
  if (!token) throw new Error('Non authentifié')

  const res = await fetch('/api/claude/focus', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ projects: toFocusPayload(projects) }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Focus du jour indisponible (${res.status})${detail ? ` : ${detail}` : ''}`)
  }
  const data = (await res.json()) as { text?: string }
  return data.text ?? ''
}
