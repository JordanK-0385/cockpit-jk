import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react'
import { Send, Sparkles, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GlassPill } from '@/components/ui/GlassPill'
import { GlassInput } from '@/components/ui/GlassInput'
import { MarkdownBubble } from '@/components/chat/MarkdownBubble'
import { cn, logger } from '@/lib/utils'
import { streamChat } from '@/lib/chat'
import { buildApiMessages, type Msg } from '@/lib/chat-messages'

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

export function ColumnCenter() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // RAF-coalesced auto-scroll. Without this, a streaming Claude response
  // fires `el.scrollTop = el.scrollHeight` on every token (~60×/sec),
  // and reading scrollHeight forces a synchronous layout — that was the
  // dominant cause of the mouse-lag during streams. Now we batch into
  // at most one scroll per animation frame.
  const rafIdRef = useRef<number | null>(null)
  // Sticky-to-bottom: only follow the stream while the user is already
  // near the bottom. If they scrolled up to re-read, we leave them
  // alone and skip the layout work entirely.
  const isNearBottomRef = useRef(true)

  useEffect(() => {
    if (!isNearBottomRef.current) return
    const el = scrollerRef.current
    if (!el) return
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
      rafIdRef.current = null
    })
  }, [messages])

  // Cancel any in-flight RAF + the stream itself on unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
    },
    [],
  )

  const handleScroll = useCallback((e: UIEvent<HTMLElement>) => {
    const el = e.currentTarget
    // 100px threshold: small "follow zone" at the bottom. Anywhere
    // higher = user is reading, we stop following.
    isNearBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 100
  }, [])

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

    // Submitting always re-locks the view to the bottom, even if the
    // user was scrolled up reading older content.
    isNearBottomRef.current = true
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
    <section
      className="col-scroll relative flex flex-col"
      ref={scrollerRef}
      onScroll={handleScroll}
    >
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

/**
 * MessageRow is memo'd with a content-length comparison so that, while
 * one bubble is streaming and its text grows by a token each frame,
 * the OTHER bubbles in the list don't reconcile.
 *
 * During streaming a Claude bubble renders as a plain <pre> (no markdown
 * parse). Once the stream closes (streaming flag flips false) we swap
 * to <MarkdownBubble>. This skips ~60 react-markdown + react-syntax-
 * highlighter passes per second on long answers — the dominant cost
 * during streaming.
 */
type MessageRowProps = { msg: Msg }

function MessageRowBase({ msg }: MessageRowProps) {
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
  const streaming = msg.role === 'claude' && msg.streaming === true
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <GlassCard
        depth="flat"
        surface="flat"
        tone={isUser ? 'glacier' : 'neutral'}
        hoverable={false}
        className={cn(
          'px-4 py-3 max-w-2xl',
          isUser ? 'bg-glacier/10' : 'bg-glass-7',
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed text-cream-50 whitespace-pre-wrap">
            {msg.text}
          </p>
        ) : streaming ? (
          // Streaming: cheap raw text. font-sans overrides <pre>'s default
          // monospace so the visual matches the markdown render that
          // replaces it once the stream closes.
          <div className="text-sm text-cream-50">
            <pre className="font-sans leading-relaxed whitespace-pre-wrap m-0">
              {msg.text}
            </pre>
            <StreamingCursor empty={!msg.text} />
          </div>
        ) : (
          <div className="text-sm text-cream-50">
            <MarkdownBubble text={msg.text} />
          </div>
        )}
      </GlassCard>
    </div>
  )
}

const MessageRow = memo(MessageRowBase, (prev, next) => {
  // memo: return TRUE when props are equal (skip render).
  const a = prev.msg
  const b = next.msg
  if (a.id !== b.id) return false
  if (a.role !== b.role) return false
  // Length-only comparison for text — streaming deltas always grow, so
  // this is a cheap O(1) proxy for "content changed". Saves the
  // string-compare cost on every token for already-finalized bubbles.
  const aText = 'text' in a ? a.text : ''
  const bText = 'text' in b ? b.text : ''
  if (aText.length !== bText.length) return false
  // Streaming flag is what triggers the <pre> → <MarkdownBubble> swap.
  // Must invalidate the memo when it flips, even if length is unchanged.
  const aStreaming = a.role === 'claude' && a.streaming === true
  const bStreaming = b.role === 'claude' && b.streaming === true
  if (aStreaming !== bStreaming) return false
  return true
})

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
