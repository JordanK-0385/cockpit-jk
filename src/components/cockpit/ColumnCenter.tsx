import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send, Sparkles, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassPill } from '@/components/ui/GlassPill'
import { GlassInput } from '@/components/ui/GlassInput'
import { MarkdownBubble } from '@/components/chat/MarkdownBubble'
import { cn, logger } from '@/lib/utils'
import { streamChat, type ChatMessage } from '@/lib/chat'

type Msg =
  // `synthetic` flags UI-only messages (greeting, error placeholders…)
  // that must NEVER be sent to the Anthropic API — they don't exist as
  // far as the conversation history is concerned.
  | { id: string; role: 'claude'; text: string; streaming?: boolean; synthetic?: boolean }
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'suggestion'; text: string }

const INITIAL_MESSAGES: Msg[] = [
  {
    id: 'greet-1',
    role: 'claude',
    synthetic: true,
    text:
      "Bonjour Jordan. Sprint 2 — étape 1 est en place : le chat est branché en streaming à l'API Anthropic. Pour l'instant je n'ai pas encore le contexte de ton Airtable (ça arrive en étape 4) ni de tools (étape 5), mais le pipe fonctionne. Teste avec une question simple.",
  },
]

function uid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Build the Anthropic-bound payload from the UI state + the new user
 * text. Three guarantees:
 *   1. Suggestion bubbles and synthetic Claude messages (greeting,
 *      placeholders) are excluded — they're UI artifacts only.
 *   2. Empty Claude messages (streaming placeholders that never got
 *      any text) are dropped.
 *   3. The result always starts with a user message — defensive strip
 *      of any leading assistant turn, since the Anthropic API rejects
 *      conversations that don't begin with `user`.
 */
function buildApiMessages(uiMessages: Msg[], newUserText: string): ChatMessage[] {
  const history: ChatMessage[] = []
  for (const m of uiMessages) {
    if (m.role === 'suggestion') continue
    if (m.role === 'claude' && m.synthetic) continue
    if (m.role === 'claude' && m.text.trim() === '') continue
    history.push({
      role: m.role === 'claude' ? 'assistant' : 'user',
      content: m.text,
    })
  }
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift()
  }
  return [...history, { role: 'user', content: newUserText }]
}

export function ColumnCenter() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Auto-scroll on new content.
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setError(null)
    setInput('')
    setSending(true)

    const userMsg: Msg = { id: uid(), role: 'user', text }
    const claudeMsg: Msg = { id: uid(), role: 'claude', text: '', streaming: true }

    const conversationForApi = buildApiMessages(messages, text)

    setMessages((prev) => [...prev, userMsg, claudeMsg])

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      await streamChat(conversationForApi, {
        signal: ctrl.signal,
        onText: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === claudeMsg.id && m.role === 'claude'
                ? { ...m, text: m.text + delta }
                : m,
            ),
          )
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === claudeMsg.id && m.role === 'claude'
                ? { ...m, streaming: false }
                : m,
            ),
          )
        },
        onError: (err) => {
          logger.error('streamChat error', err)
          setError(err.message)
        },
      })
    } catch (err) {
      if (ctrl.signal.aborted) {
        // user navigated / unmounted — nothing to surface
      } else {
        const message = err instanceof Error ? err.message : 'Erreur de streaming'
        setError(message)
        // Remove the empty Claude bubble that never got any content.
        setMessages((prev) =>
          prev
            .map((m) =>
              m.id === claudeMsg.id && m.role === 'claude'
                ? { ...m, streaming: false }
                : m,
            )
            .filter(
              (m) => !(m.id === claudeMsg.id && m.role === 'claude' && !m.text),
            ),
        )
      }
    } finally {
      setSending(false)
      // Keep focus in the input bar for fast back-and-forth.
      inputRef.current?.focus()
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <section className="col-scroll relative flex flex-col" ref={scrollerRef}>
      {/* sticky pill */}
      <div className="glass-input-bar sticky top-0 z-10 px-6 py-4 bg-ink-deepest/30 border-b border-glass-10">
        <div className="flex items-center justify-between">
          <GlassPill tone="sage" pulse>
            <Sparkles className="h-3.5 w-3.5 text-sage" />
            <span className="text-xs">
              {sending ? 'Claude réfléchit…' : 'Claude écoute'}
            </span>
          </GlassPill>
          <span className="eyebrow">Sprint 2 · étape 1</span>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 px-6 py-6 space-y-4">
        {messages.map((m) => (
          <MessageRow key={m.id} msg={m} />
        ))}
      </div>

      {/* sticky input + error */}
      <div className="glass-input-bar sticky bottom-0 z-10 px-6 py-4 bg-ink-deepest/30 border-t border-glass-10">
        {error && (
          <div className="mb-3 flex items-start gap-2 text-xs text-terracotta-light bg-terracotta/10 border border-terracotta/30 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <GlassInput
              ref={inputRef}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Parle à Claude…"
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className={cn(
              'h-12 w-12 rounded-xl border flex items-center justify-center transition-colors',
              sending || !input.trim()
                ? 'bg-glass-7 border-glass-10 text-muted-deeper'
                : 'bg-sage/20 hover:bg-sage/30 border-sage/40 text-sage-light',
            )}
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
  const streaming = msg.role === 'claude' && msg.streaming
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <GlassCard
        depth="flat"
        surface={isUser ? 'flat' : 'glass'}
        tone={isUser ? 'glacier' : 'neutral'}
        hoverable={false}
        className={cn(
          'px-4 py-3 max-w-2xl',
          !isUser && 'glass-bubble',
          isUser ? 'bg-glacier/10' : 'bg-glass-7',
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed text-cream-50 whitespace-pre-wrap">
            {msg.text}
          </p>
        ) : (
          <div className="text-sm text-cream-50">
            <MarkdownBubble text={msg.text} />
            {streaming && <StreamingCursor empty={!msg.text} />}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

function StreamingCursor({ empty }: { empty?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block w-[2px] h-[1em] align-[-2px] bg-sage ml-[2px]',
        'animate-pill-pulse',
        empty && 'opacity-80',
      )}
    />
  )
}
