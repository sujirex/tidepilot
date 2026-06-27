'use client'

/**
 * TideChat.tsx
 * ------------
 * Floating AI chat button for TidePilot.
 * Users type natural language tide questions and get instant answers.
 *
 * - Fixed bottom-right button opens/closes the chat panel
 * - Suggested quick queries shown as chip buttons
 * - All AI logic is in aiQuery.ts — zero API calls, works offline
 */

import { useState, useRef, useEffect } from 'react'
import { answerQuery, SUGGESTED_QUERIES } from '@/lib/aiQuery'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'ai'
  text: string
  time: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowIST(): string {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === 'ai'
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isAI ? 'flex-start' : 'flex-end',
      marginBottom: 12,
    }}>
      {/* Bubble */}
      <div style={{
        maxWidth: '88%',
        padding: '10px 14px',
        borderRadius: isAI ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isAI
          ? 'rgba(10, 150, 150, 0.12)'
          : 'var(--accent-cyan)',
        border: isAI
          ? '1px solid rgba(10, 150, 150, 0.25)'
          : 'none',
        color: isAI ? 'var(--text-primary)' : '#021414',
        fontSize: '0.82rem',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {isAI && (
          <div style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'var(--accent-cyan)',
            marginBottom: 4,
            letterSpacing: '0.05em',
          }}>
            🌊 TidePilot AI
          </div>
        )}
        {msg.text}
      </div>
      {/* Timestamp */}
      <div style={{
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        marginTop: 3,
        paddingLeft: isAI ? 2 : 0,
        paddingRight: isAI ? 0 : 2,
      }}>
        {msg.time}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TideChat() {
  const [open,     setOpen]     = useState(false)
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: [
        'Hi! I\'m TidePilot AI. 👋',
        '',
        'Ask me anything about tides at Indian ports — in plain English.',
        '',
        'Try one of the suggestions below, or type your own question.',
      ].join('\n'),
      time: nowIST(),
    },
  ])
  const [thinking, setThinking] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  function send(query: string) {
    const q = query.trim()
    if (!q || thinking) return

    const userMsg: Message = { role: 'user', text: q, time: nowIST() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)

    // Small delay so the UI feels responsive (not instant robot)
    setTimeout(() => {
      const { answer } = answerQuery(q)
      const aiMsg: Message = { role: 'ai', text: answer, time: nowIST() }
      setMessages(prev => [...prev, aiMsg])
      setThinking(false)
    }, 350)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <>
      {/* ── Floating button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--brand-gradient)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 4px 20px rgba(10, 150, 150, 0.45)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(10, 150, 150, 0.6)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(10, 150, 150, 0.45)'
        }}
      >
        {open ? '✕' : '🌊'}
      </button>

      {/* ── Chat panel ───────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 92,
          right: 24,
          zIndex: 999,
          width: 'min(380px, calc(100vw - 32px))',
          height: 'min(540px, calc(100vh - 120px))',
          borderRadius: 16,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-accent)',
          boxShadow: 'var(--glass-shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '1.3rem' }}>🌊</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#021414' }}>
                TidePilot AI
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(2,20,20,0.65)' }}>
                Natural language tide queries · Indian ports
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 14px 4px',
            scrollbarWidth: 'thin',
          }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {/* Thinking indicator */}
            {thinking && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 12,
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}>
                <span style={{ animation: 'pulse 1s infinite' }}>🌊</span>
                Calculating tides…
              </div>
            )}

            {/* Suggested queries — only show when no user messages yet */}
            {messages.length === 1 && !thinking && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                  paddingLeft: 2,
                }}>
                  Try asking:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUGGESTED_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => send(q)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 20,
                        border: '1px solid var(--border-accent)',
                        background: 'rgba(10,150,150,0.08)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,150,150,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,150,150,0.08)'}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            flexShrink: 0,
            background: 'var(--bg-card)',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about any Indian port tide…"
              disabled={thinking}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-accent)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'inherit',
                opacity: thinking ? 0.6 : 1,
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || thinking}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: 'none',
                background: input.trim() && !thinking
                  ? 'var(--brand-gradient)'
                  : 'var(--bg-card)',
                color: input.trim() && !thinking ? '#021414' : 'var(--text-muted)',
                cursor: input.trim() && !thinking ? 'pointer' : 'default',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}
