/** Formatage partagé des tuiles / cartes Monitoring n8n. */

export function formatDuration(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`
  const m = Math.floor(s / 60)
  const rem = Math.round(s % 60)
  return `${m} min ${rem.toString().padStart(2, '0')}`
}

export function formatPct(rate: number): string {
  return `${Math.round(rate * 100)} %`
}

/** « il y a 3 min », « il y a 2 h », etc. */
export function formatRelative(iso: string | null, nowMs: number = Date.now()): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const diff = nowMs - t
  if (diff < 0) return "à l'instant"
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}
