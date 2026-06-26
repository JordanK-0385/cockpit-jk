/**
 * Module Apprendre — logique pure de génération/parsing des QCM.
 * Séparé de l'endpoint pour être testable sans I/O ni SDK.
 */

export type QuizQuestion = {
  question: string
  choices: string[]
  answerIndex: number
  explication: string
}

export type GlossaryItem = {
  terme: string
  definition: string
}

/** Schéma visuel de la fiche — 4 patrons rendus en glass côté front. */
export type SchemaKind = 'umbrella' | 'flow' | 'compare' | 'layers'
export type SchemaNode = { label: string; sub?: string }
export type FicheSchema = {
  kind: SchemaKind
  title?: string
  nodes: SchemaNode[]
}

/** Réponse complète de l'endpoint. */
export type QuizPayload = {
  questions: QuizQuestion[]
  glossaire: GlossaryItem[]
  enseignements: string[]
  schema: FicheSchema | null
}

export type QuizParams = {
  sujet: string
  niveau: string
  angle?: string
  n?: number
}

export const QUIZ_MODEL = process.env.CLAUDE_QUIZ_MODEL || 'claude-sonnet-4-6'
export const QUIZ_MAX_TOKENS = 3072
export const DEFAULT_QUESTION_COUNT = 5
export const MAX_QUESTION_COUNT = 10
export const SCHEMA_KINDS: SchemaKind[] = ['umbrella', 'flow', 'compare', 'layers']

export const QUIZ_SYSTEM_PROMPT = `Tu es un excellent vulgarisateur technique pour la formation continue d'un consultant IA et automatisation (JK Consulting).
Tu génères des questions à choix multiples en français, précises, sans ambiguïté, avec une seule bonne réponse par question.
Règle de STYLE — s'applique à explication, glossaire et enseignements :
- Langage simple et imagé, comme à un collègue intelligent mais non spécialiste : sers-toi d'une analogie ou d'un exemple concret quand ça aide à comprendre (ex. « pandas prépare les ingrédients, scikit-learn cuisine »).
- On simplifie la FORMULATION, jamais le fond : garde le terme technique exact mais rends-le compréhensible. Pas de jargon gratuit.
- 2 à 3 phrases maximum, droit à l'essentiel.
- Écris les noms de méthodes/fonctions en clair (ex. .fit(), .predict()), sans Markdown ni backticks : l'affichage est en texte brut.
Règles QCM :
- 4 propositions par question, exactement une correcte ; distracteurs plausibles (on teste la connaissance réelle, pas la logique d'élimination).
- Calibre la difficulté sur le niveau demandé.
- explication : justifie la bonne réponse ET dit pourquoi le piège principal est faux, dans le style ci-dessus.
- glossaire : pour chaque acronyme/terme, donne le développement puis une définition simple et imagée, en une phrase.
- enseignements : 3 à 5 points clés à retenir, formulés simplement, chacun avec si possible une image concrète.
- schema : UNIQUEMENT si le sujet se prête vraiment à une représentation visuelle simple, sinon mets-le à null. Choisis le patron le plus pertinent :
    * "umbrella" : un concept englobe d'autres (nodes[0] = le contenant, les suivants = les contenus).
    * "flow" : une séquence d'étapes (nodes dans l'ordre).
    * "compare" : 2 ou 3 notions opposées (chaque node = une colonne).
    * "layers" : un empilement / niveaux (nodes du haut vers le bas).
  Chaque node a "label" (≤ 18 caractères) et "sub" optionnel (≤ 32 caractères). Maximum 4 nodes. Pas de schéma artificiel : si rien d'évident, schema = null.
Tu réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, sans bloc Markdown.`

export function buildQuizUserPrompt(p: QuizParams): string {
  const n = clampCount(p.n)
  const lines = [`Sujet : ${p.sujet}`, `Niveau : ${p.niveau}`]
  if (p.angle && p.angle.trim()) lines.push(`Angle à couvrir en priorité : ${p.angle.trim()}`)
  lines.push('')
  lines.push(`Génère exactement ${n} questions.`)
  lines.push('Réponds avec ce format JSON STRICT :')
  lines.push(
    '{"questions":[{"question":"...","choices":["A","B","C","D"],"answerIndex":0,"explication":"..."}],' +
      '"glossaire":[{"terme":"NLU","definition":"..."}],' +
      '"enseignements":["...","..."],' +
      '"schema":{"kind":"umbrella","title":"...","nodes":[{"label":"NLP","sub":"parapluie"},{"label":"NLU","sub":"comprendre"}]}}',
  )
  lines.push('"answerIndex" est l\'index (0 à 3) de la bonne proposition. "schema" peut être null.')
  return lines.join('\n')
}

export function clampCount(n?: number): number {
  if (n === undefined || n === null || !Number.isFinite(n)) return DEFAULT_QUESTION_COUNT
  return Math.max(1, Math.min(MAX_QUESTION_COUNT, Math.floor(n)))
}

export function stripCodeFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenced ? fenced[1] : raw).trim()
}

export function parseQuizResponse(raw: string): QuizPayload {
  const text = stripCodeFences(raw)
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Réponse du modèle non parsable en JSON')
    }
    data = JSON.parse(text.slice(start, end + 1))
  }
  const obj = data as {
    questions?: unknown
    glossaire?: unknown
    enseignements?: unknown
    schema?: unknown
  }
  if (!Array.isArray(obj?.questions) || obj.questions.length === 0) {
    throw new Error('JSON valide mais aucune question trouvée')
  }
  return {
    questions: obj.questions.map((q, i) => normalizeQuestion(q, i)),
    glossaire: normalizeGlossary(obj.glossaire),
    enseignements: normalizeStringList(obj.enseignements),
    schema: normalizeSchema(obj.schema),
  }
}

function normalizeQuestion(q: unknown, i: number): QuizQuestion {
  const obj = q as Record<string, unknown>
  const question = typeof obj?.question === 'string' ? obj.question.trim() : ''
  const choices = Array.isArray(obj?.choices)
    ? obj.choices.filter((c): c is string => typeof c === 'string').map((c) => c.trim())
    : []
  const answerIndex = typeof obj?.answerIndex === 'number' ? Math.floor(obj.answerIndex) : -1
  const explication = typeof obj?.explication === 'string' ? obj.explication.trim() : ''

  if (!question) throw new Error(`Question ${i + 1} : énoncé manquant`)
  if (choices.length < 2) throw new Error(`Question ${i + 1} : au moins 2 propositions requises`)
  if (answerIndex < 0 || answerIndex >= choices.length) {
    throw new Error(`Question ${i + 1} : answerIndex hors limites`)
  }
  return { question, choices, answerIndex, explication }
}

export function normalizeGlossary(raw: unknown): GlossaryItem[] {
  if (!Array.isArray(raw)) return []
  const out: GlossaryItem[] = []
  for (const item of raw) {
    const o = item as Record<string, unknown>
    const terme = typeof o?.terme === 'string' ? o.terme.trim() : ''
    const definition = typeof o?.definition === 'string' ? o.definition.trim() : ''
    if (terme && definition) out.push({ terme, definition })
  }
  return out
}

export function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean)
}

/**
 * Valide le schéma : kind dans la liste blanche, 2 à 4 nodes avec label non
 * vide. Renvoie null si absent ou invalide (pas de schéma forcé).
 */
export function normalizeSchema(raw: unknown): FicheSchema | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = o.kind as SchemaKind
  if (!SCHEMA_KINDS.includes(kind)) return null
  if (!Array.isArray(o.nodes)) return null
  const nodes: SchemaNode[] = []
  for (const n of o.nodes.slice(0, 4)) {
    const no = n as Record<string, unknown>
    const label = typeof no?.label === 'string' ? no.label.trim() : ''
    if (!label) continue
    const sub = typeof no?.sub === 'string' ? no.sub.trim() : undefined
    nodes.push(sub ? { label, sub } : { label })
  }
  if (nodes.length < 2) return null
  const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim() : undefined
  return title ? { kind, title, nodes } : { kind, nodes }
}
