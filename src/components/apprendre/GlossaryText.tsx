import { Fragment, type ReactNode } from 'react'
import type { GlossaryItem } from '@/lib/quiz'

/**
 * Affiche un texte en soulignant les termes présents dans le glossaire ;
 * la définition apparaît au survol (tooltip). Discret : aucune définition
 * affichée en permanence, conformément au besoin (mouseover only).
 *
 * Implémentation volontairement simple : on découpe le texte sur les
 * occurrences (insensible à la casse, sur frontières de mot quand possible),
 * sans dépendance externe. Le tooltip natif (title) garantit l'accessibilité,
 * doublé d'un style pointillé pour signaler le survol.
 */
export function GlossaryText({
  text,
  glossaire,
}: {
  text: string
  glossaire: GlossaryItem[]
}): ReactNode {
  if (!glossaire.length || !text) return text

  // Termes triés du plus long au plus court pour matcher en priorité les
  // expressions composées avant leurs sous-chaînes.
  const terms = [...glossaire]
    .filter((g) => g.terme.trim().length > 1)
    .sort((a, b) => b.terme.length - a.terme.length)
  if (!terms.length) return text

  const escaped = terms.map((t) => escapeRegExp(t.terme))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)

  return (
    <>
      {parts.map((part, i) => {
        const match = terms.find((t) => t.terme.toLowerCase() === part.toLowerCase())
        if (!match) return <Fragment key={i}>{part}</Fragment>
        return (
          <span
            key={i}
            title={match.definition}
            className="underline decoration-dotted decoration-sage/60 underline-offset-2 cursor-help text-sage-light"
          >
            {part}
          </span>
        )
      })}
    </>
  )
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
