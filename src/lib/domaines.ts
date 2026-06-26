/** Code couleur par domaine d'apprentissage — repérage visuel des fiches. */
export type DomaineTone = {
  chip: string // classes pour la pastille (bg/border/text)
  accent: string // classe border-left pour l'accent de carte
}

const TONES: Record<'sage' | 'glacier' | 'terracotta', DomaineTone> = {
  sage: { chip: 'bg-sage/15 border-sage/30 text-sage-light', accent: 'border-l-sage/50' },
  glacier: { chip: 'bg-glacier/15 border-glacier/30 text-glacier-light', accent: 'border-l-glacier/50' },
  terracotta: {
    chip: 'bg-terracotta/15 border-terracotta/30 text-terracotta-light',
    accent: 'border-l-terracotta/50',
  },
}

const MAP: Record<string, keyof typeof TONES> = {
  Fondamentaux: 'sage',
  LLM: 'glacier',
  Algorithme: 'sage',
  Data: 'glacier',
  Tools: 'sage',
  Sécurité: 'terracotta',
  Conformité: 'terracotta',
}

function hashTone(s: string): keyof typeof TONES {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (['sage', 'glacier', 'terracotta'] as const)[h % 3]
}

export function domaineTone(domaine: string): DomaineTone {
  return TONES[MAP[domaine] ?? hashTone(domaine || 'x')]
}
