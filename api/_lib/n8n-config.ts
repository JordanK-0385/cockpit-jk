/**
 * Configuration centralisée du Monitoring n8n (côté serveur uniquement).
 * Un seul endroit pour les prix, seuils et métadonnées à maintenir à la main.
 * Aucun secret ici — ces valeurs peuvent vivre dans le repo.
 */

// ── Seuils & bornes ────────────────────────────────────────────────────────
export const NOT_IMPROVED_DAYS = 30 // workflow « pas amélioré » si updatedAt plus vieux
export const CREDENTIAL_WARN_DAYS = 15 // « Token J-N » si expiration sous ce seuil
export const COST_WINDOW_DAYS = 30 // fenêtre de calcul tokens/coût
export const DATA_FETCH_CAP = 150 // nb max de runs dont on récupère includeData=true
export const DATA_FETCH_CONCURRENCY = 6 // parallélisme des fetchs de détail

// ── Prix des modèles ───────────────────────────────────────────────────────
// $ / 1M tokens (input, output). Tarifs PUBLICS Anthropic (USD).
// Source de vérité unique : à ajuster ici si les tarifs changent.
export type ModelPrice = { in: number; out: number }
export const MODEL_PRICES: Record<string, ModelPrice> = {
  opus: { in: 15, out: 75 },
  sonnet: { in: 3, out: 15 },
  'haiku-3-5': { in: 0.8, out: 4 },
  haiku: { in: 1, out: 5 },
}
export const CURRENCY = 'USD'
// Si renseigné (ex. 0.92), convertit les montants $ → € à l'affichage serveur.
// Laissé à null tant que Jordan n'a pas fixé un taux : on n'invente pas de conversion.
export const EUR_USD_RATE: number | null = null

/** Résout un id de modèle Anthropic brut vers un tarif de la table. */
export function priceForModel(model: string | null | undefined): ModelPrice | null {
  if (!model) return null
  const m = model.toLowerCase()
  if (m.includes('opus')) return MODEL_PRICES.opus
  if (m.includes('haiku')) {
    return m.includes('3-5') || m.includes('3.5') ? MODEL_PRICES['haiku-3-5'] : MODEL_PRICES.haiku
  }
  if (m.includes('sonnet')) return MODEL_PRICES.sonnet
  return null
}

// ── Lot C : node de sortie « utile » par workflow (optionnel) ──────────────
// Clé = workflowId, valeur = nom du node dont on compte les items en sortie.
// À défaut, on prend le dernier node exécuté (heuristique, cf. UI).
export const SILENT_OUTPUT_NODE: Record<string, string> = {
  // 'AbCdEf123456': 'Send Email',
}

// ── Lot D : expirations de credentials (à compléter par Jordan) ─────────────
// Dates VIDES au départ : aucun flag tant qu'une date n'est pas renseignée
// (format 'YYYY-MM-DD'). `workflows` = libellés exacts des workflows concernés.
export type CredentialExpiryConfig = {
  label: string
  date: string // '' = non renseigné → ignoré
  workflows?: string[]
}
export const CREDENTIALS_EXPIRY: CredentialExpiryConfig[] = [
  { label: 'Meta (Facebook/Instagram)', date: '', workflows: [] },
  { label: 'OAuth 360 dialog', date: '', workflows: [] },
  { label: 'Google (OAuth)', date: '', workflows: [] },
  { label: 'LinkedIn', date: '', workflows: [] },
  { label: 'Anthropic API', date: '', workflows: [] },
]
