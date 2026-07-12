import { Sparkles, TrendingUp } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { clientTone } from '@/lib/n8n'
import type { N8nClientOpportunities } from '@/lib/n8n-types'

/**
 * Section « Opportunités par client » (lot F). Lecture du cache IA uniquement —
 * aucune génération ici (déclenchée par le bouton « Analyser mon parc »).
 */
export function OpportunitiesSection({ opportunities }: { opportunities: N8nClientOpportunities[] }) {
  if (opportunities.length === 0) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-sage" />
        <h3 className="text-sm font-semibold text-cream-50">Opportunités par client</h3>
        <span className="text-eyebrow text-muted-deeper">conseil IA</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {opportunities.map((c) => (
          <GlassCard
            key={c.client}
            depth="l3"
            surface="flat"
            tone={clientTone(c.client)}
            hoverable={false}
            className="p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-sage" />
              <span className="text-sm font-semibold text-cream-50">{c.client}</span>
            </div>
            <ul className="space-y-2.5">
              {c.opportunities.map((o, i) => (
                <li key={i}>
                  <p className="text-xs font-medium text-cream-50 leading-snug">{o.title}</p>
                  {o.pitch && <p className="text-eyebrow text-muted leading-snug mt-0.5">{o.pitch}</p>}
                </li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
