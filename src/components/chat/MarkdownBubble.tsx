import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// Selectively register Prism languages the model is most likely to emit.
// PrismLight + manual registration keeps the bundle small — adding a
// new language is a 1-line import.
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'

SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('diff', diff)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('md', markdown)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('py', python)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('yaml', yaml)
SyntaxHighlighter.registerLanguage('yml', yaml)

// Custom syntax-highlighter background — sits inside the glass bubble
// so a fully-opaque slab would break the Alpine Studio depth. ink-deepest
// at 55% gives enough contrast for code without floating away from the
// bubble.
const CODE_BLOCK_STYLE = {
  background: 'rgba(14,31,28,0.55)',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.06)',
  margin: '0.6rem 0',
  padding: '0.8rem 1rem',
  fontSize: '0.82em',
  lineHeight: '1.5',
} as const

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-cream-50">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-cream-50">{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sage-light underline decoration-sage/40 underline-offset-2 hover:decoration-sage transition-colors"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 mb-2 last:mb-0 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 mb-2 last:mb-0 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed marker:text-sage/60">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-sage/40 pl-3 italic text-muted mb-2 last:mb-0">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium mb-1 mt-2 first:mt-0 text-sage-light">{children}</h3>
  ),
  hr: () => <hr className="border-glass-10 my-3" />,
  // Tables (remark-gfm)
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2 last:mb-0">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-glass-16">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-2 py-1.5 font-medium text-muted">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 border-b border-glass-10/60 align-top">{children}</td>
  ),
  // Inline vs block code. In react-markdown v9+, the `inline` prop is
  // gone — detect blocks by presence of a `language-*` className.
  code: ({ className, children, ...rest }) => {
    const match = /language-([\w-]+)/.exec(className || '')
    if (match) {
      const lang = match[1].toLowerCase()
      const code = String(children).replace(/\n$/, '')
      return (
        <SyntaxHighlighter
          language={lang}
          style={oneDark}
          customStyle={CODE_BLOCK_STYLE}
          // Wrapper as <div> so we don't end up with <pre><pre> when
          // markdown wraps code blocks in <pre> by default. We also
          // override `pre` below to render a fragment so no wrapper
          // exists at all — this is belt+suspenders.
          PreTag="div"
          codeTagProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
          }}
        >
          {code}
        </SyntaxHighlighter>
      )
    }
    return (
      <code
        {...rest}
        className="px-1.5 py-0.5 rounded bg-glass-10 text-sage-light font-mono text-[0.85em]"
      >
        {children}
      </code>
    )
  },
  // Strip the default <pre> wrapper — our SyntaxHighlighter renders its
  // own <div> via PreTag, and inline code never needs <pre>.
  pre: ({ children }) => <>{children}</>,
}

const REMARK_PLUGINS = [remarkGfm]

/**
 * Markdown renderer scoped to Claude chat bubbles. Cream text by default,
 * sage accents on h3 / list markers / inline code, glacier-free.
 * Streaming-safe: partial markdown (unclosed code fence, half table)
 * renders gracefully — react-markdown treats unparsed bits as raw text.
 */
function MarkdownBubbleBase({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
      {text}
    </ReactMarkdown>
  )
}

export const MarkdownBubble = memo(MarkdownBubbleBase)
