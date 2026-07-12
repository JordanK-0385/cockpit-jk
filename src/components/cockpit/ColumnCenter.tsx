import {
  memo,
  useCallback,
  useEffect,
  useMemo,
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
import { useAuth } from '@/lib/auth'
import { loadHistory, saveTurn } from '@/lib/chat-store'
import { useActiveTasks, useProjects, useRecentSessions } from '@/lib/queries'
import { buildSuggestions } from '@/lib/suggestions'

const INITIAL_MESSAGES: Msg[] = [
  {
    id: 'greet-1',
    role: 'claude',
    synthetic: true,
    text:
      "Bonjour Jordan. J'ai le contexte de ton Airtable — projets actifs, tâches du jour, bloquants et tes 3 dernières sessions, rafraîchis à chaque message. Je peux aussi créer des tâches et changer leur statut directement dans la base, et je garde l'historique de nos conversations. Demande-moi où en est un projet, ce que tu as à faire aujourd'hui, ou un récap de tes dernières sessions.",
  },
]

function uid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function ColumnCenter({ contextPrefill }: { contextPrefill?: string } = {}) {
  const { user } = useAuth()
  const userId = user?.uid ?? null
  // Start empty (NOT with the greeting) so the synthetic greeting can't flash
  // before we know whether a persisted history exists. The greeting is only
  // injected once loadHistory confirms there is no stored conversation.
  const [messages, setMessages] = useState<Msg[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  // Préremplissage optionnel (ouverture depuis une carte client). ColumnCenter
  // est remonté à chaque ouverture du drawer, donc l'état initial suffit.
  const [input, setInput] = useState(contextPrefill ?? '')
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

  // Proactive suggestions (étape 7): deterministic chips derived from the
  // Airtable data ALREADY cached by react-query. No new network/LLM call —
  // these hooks share the cache populated by the Cockpit columns.
  const tasksQuery = useActiveTasks()
  const projectsQuery = useProjects()
  const sessionsQuery = useRecentSessions(3)
  const suggestions = useMemo(
    () =>
      buildSuggestions({
        tasks: (tasksQuery.data ?? []).map((r) => r.fields),
        projects: (projectsQuery.data ?? []).map((r) => r.fields),
        sessions: (sessionsQuery.data ?? []).map((r) => r.fields),
      }),
    [tasksQuery.data, projectsQuery.data, sessionsQuery.data],
  )

  // Load the persisted conversation once the user is known. If there's a
  // stored history we render it; otherwise we fall back to the synthetic
  // greeting. Either way we flip `historyLoaded` so the UI stops showing the
  // loading state. A failed read degrades gracefully to the greeting.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setHistoryLoaded(false)
    loadHistory(userId)
      .then((history) => {
        if (cancelled) return
        setMessages(history.length > 0 ? history : INITIAL_MESSAGES)
        setHistoryLoaded(true)
      })
      .catch((err) => {
        logger.error('loadHistory failed', err)
        if (cancelled) return
        setMessages(INITIAL_MESSAGES)
        setHistoryLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

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

  // Core send path, shared by the form and the suggestion chips. Takes the
  // text directly so a chip click can submit its phrase as a user message
  // without going through the input box.
  async function submitText(raw: string) {
    const text = raw.trim()
    if (!text || sending) return

    setError(null)
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

    // Accumulate the final Claude text out-of-band so onDone can persist it
    // without reading stale `messages` state from the closure.
    let finalClaudeText = ''

    try {
      await streamChat(conversationForApi, {
        signal: ctrl.signal,
        onText: (delta) => {
          finalClaudeText += delta
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
          // Persist only a COMPLETED turn (onDone never fires on error/abort).
          // saveTurn itself no-ops on empty Claude text, so the conversation
          // never desyncs. Fire-and-forget: persistence must not block the UI.
          if (userId && finalClaudeText.trim() !== '') {
            void saveTurn(userId, text, finalClaudeText).catch((err) =>
              logger.error('saveTurn failed', err),
            )
          }
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

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    // Only the form clears the visible input; submitText owns the rest.
    setInput('')
    void submitText(text)
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  // Suggestions show ONLY at the very start of a conversation: history loaded,
  // not sending, and no real user/claude turn yet (the synthetic greeting
  // doesn't count). Once Jordan has exchanged a turn or a stored history is
  // shown, they disappear.
  const hasRealTurn = messages.some(
    (m) => m.role === 'user' || (m.role === 'claude' && !m.synthetic),
  )
  const showSuggestions = historyLoaded && !sending && !hasRealTurn && suggestions.length > 0

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
          <span className="eyebrow">Sprint 2 · étape 7</span>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 px-6 py-6 space-y-4">
        {!historyLoaded ? (
          <div className="flex justify-center pt-6">
            <GlassPill tone="sage">
              <Sparkles className="h-3.5 w-3.5 text-sage animate-pill-pulse" />
              <span className="text-xs">Chargement de la conversation…</span>
            </GlassPill>
          </div>
        ) : (
          messages.map((m) => <MessageRow key={m.id} msg={m} />)
        )}

        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void submitText(s)}
                disabled={sending}
                className="text-left"
                aria-label={`Suggestion : ${s}`}
              >
                <GlassPill
                  tone="glacier"
                  className="cursor-pointer transition-colors hover:bg-glass-16"
                >
                  <span className="text-xs">{s}</span>
                </GlassPill>
              </button>
            ))}
          </div>
        )}
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
