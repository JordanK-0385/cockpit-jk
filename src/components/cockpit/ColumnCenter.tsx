import { Send, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassPill } from '@/components/ui/GlassPill'
import { GlassInput } from '@/components/ui/GlassInput'
import { cn } from '@/lib/utils'

type Msg =
  | { role: 'claude'; text: string }
  | { role: 'user'; text: string }
  | { role: 'suggestion'; text: string }

const MOCK_MESSAGES: Msg[] = [
  {
    role: 'claude',
    text:
      "Bonjour Jordan. Sprint 1 est en place — tu vois ton Airtable, le design Alpine Studio, et l'enveloppe pour la suite. Le chat sera fonctionnel en Sprint 2.",
  },
  {
    role: 'suggestion',
    text:
      "💡 Tu n'as pas encore défini de focus pour aujourd'hui. Quel est l'objectif principal ?",
  },
]

export function ColumnCenter() {
  return (
    <section className="col-scroll relative flex flex-col">
      {/* sticky pill */}
      <div className="glass-input-bar sticky top-0 z-10 px-6 py-4 bg-ink-deepest/30 border-b border-glass-10">
        <div className="flex items-center justify-between">
          <GlassPill tone="sage" pulse>
            <Sparkles className="h-3.5 w-3.5 text-sage" />
            <span className="text-xs">Claude écoute</span>
          </GlassPill>
          <span className="eyebrow">claude-sonnet-4-5 · Sprint 2</span>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 px-6 py-6 space-y-4">
        {MOCK_MESSAGES.map((m, i) => (
          <MessageRow key={i} msg={m} />
        ))}
      </div>

      {/* sticky input */}
      <div className="glass-input-bar sticky bottom-0 z-10 px-6 py-4 bg-ink-deepest/30 border-t border-glass-10">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-3"
        >
          <div className="flex-1 relative">
            <GlassInput
              placeholder="Sprint 2 ouvrira ce champ. Pour l'instant, c'est lecture seule."
              disabled
            />
          </div>
          <button
            type="submit"
            disabled
            className="h-12 w-12 rounded-xl bg-glass-7 border border-glass-10 text-muted-deeper flex items-center justify-center disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  )
}

function MessageRow({ msg }: { msg: Msg }) {
  if (msg.role === 'suggestion') {
    return (
      <div className="flex justify-center">
        <GlassCard
          depth="flat"
          tone="sage"
          hoverable={false}
          className="glass-bubble px-4 py-3 max-w-2xl border-dashed"
        >
          <p className="text-sm text-sage-light">{msg.text}</p>
        </GlassCard>
      </div>
    )
  }
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <GlassCard
        depth="flat"
        surface={isUser ? 'flat' : 'glass'}
        tone={isUser ? 'glacier' : 'neutral'}
        hoverable={false}
        className={cn(
          'px-4 py-3 max-w-2xl',
          // Claude bubbles keep the slightly stronger blur. User bubbles are flat.
          !isUser && 'glass-bubble',
          isUser ? 'bg-glacier/10' : 'bg-glass-7',
        )}
      >
        <p className="text-sm leading-relaxed text-cream-50">{msg.text}</p>
      </GlassCard>
    </div>
  )
}
