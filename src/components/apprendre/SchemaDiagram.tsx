import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FicheSchema, SchemaNode } from '@/lib/quiz'

/**
 * Module Apprendre — rendu des schémas de fiche dans le style Cockpit (glass).
 * 4 patrons : umbrella (contenance), flow (séquence), compare (colonnes),
 * layers (empilement). Données fournies par Claude, validées côté serveur.
 */

const TONES = [
  'bg-glacier/12 border-glacier/30 text-glacier-light',
  'bg-terracotta/12 border-terracotta/30 text-terracotta-light',
  'bg-sage/12 border-sage/30 text-sage-light',
] as const

function toneFor(i: number): string {
  return TONES[i % TONES.length]
}

function NodeBox({ node, tone, className }: { node: SchemaNode; tone: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border px-3 py-2.5 text-center', tone, className)}>
      <p className="text-sm font-medium leading-tight">{node.label}</p>
      {node.sub && <p className="text-[11px] text-muted mt-0.5 leading-snug">{node.sub}</p>}
    </div>
  )
}

export function SchemaDiagram({ schema }: { schema: FicheSchema }) {
  const { kind, nodes } = schema
  const children = nodes.slice(1)

  let body: React.ReactNode = null

  if (kind === 'umbrella') {
    body = (
      <div className="rounded-2xl border border-sage/35 bg-sage/[0.06] p-3">
        <div className="px-1 pb-2.5">
          <p className="text-sm font-medium text-sage-light leading-tight">{nodes[0].label}</p>
          {nodes[0].sub && <p className="text-[11px] text-muted mt-0.5">{nodes[0].sub}</p>}
        </div>
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
          {children.map((n, i) => (
            <NodeBox key={i} node={n} tone={toneFor(i)} />
          ))}
        </div>
      </div>
    )
  } else if (kind === 'flow') {
    body = (
      <div className="flex flex-wrap items-stretch gap-1.5">
        {nodes.map((n, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <NodeBox node={n} tone={toneFor(i)} className="min-w-[110px]" />
            {i < nodes.length - 1 && <ArrowRight className="h-4 w-4 text-muted-deeper shrink-0" />}
          </div>
        ))}
      </div>
    )
  } else if (kind === 'compare') {
    body = (
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
        {nodes.map((n, i) => (
          <NodeBox key={i} node={n} tone={toneFor(i)} className="py-3" />
        ))}
      </div>
    )
  } else {
    // layers : empilement du haut vers le bas
    body = (
      <div className="space-y-1.5">
        {nodes.map((n, i) => (
          <div
            key={i}
            className={cn('rounded-xl border px-3 py-2 flex items-baseline justify-between gap-3', toneFor(i))}
          >
            <span className="text-sm font-medium leading-tight">{n.label}</span>
            {n.sub && <span className="text-[11px] text-muted leading-snug text-right">{n.sub}</span>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {schema.title && <p className="text-[11px] text-muted-deeper mb-2 px-0.5">{schema.title}</p>}
      {body}
    </div>
  )
}
