'use client'

import { useState, useEffect, useMemo } from 'react'
import { Bell, Plus, Trash2, Check, ChevronDown, ChevronUp, Clock, MapPin, FileText, X } from 'lucide-react'
import { PORTS, DEFAULT_PORT_ID } from '@/lib/ports'
import {
  EVENT_TYPES, CATEGORY_LABELS, CATEGORY_COLOR,
  getEventType, loadReminders, addReminder, updateReminder, deleteReminder,
  todayISTStr, daysUntil, countdownLabel, URGENCY_STYLE,
  type Reminder, type EventCategory,
} from '@/lib/reminders'

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'upcoming' | 'today' | 'all' | 'past' | 'done'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today',    label: 'Today'    },
  { id: 'all',      label: 'All'      },
  { id: 'past',     label: 'Past'     },
  { id: 'done',     label: 'Done'     },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string, timeStr?: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return timeStr ? `${date} · ${timeStr} IST` : date
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: FilterTab }) {
  const msgs: Record<FilterTab, string> = {
    upcoming: 'No upcoming events. Add your first reminder above.',
    today:    'Nothing scheduled for today.',
    all:      'No reminders yet. Add your first event above.',
    past:     'No past events.',
    done:     'No completed events.',
  }
  return (
    <div className="glass-card p-10 text-center">
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
      <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{msgs[tab]}</p>
    </div>
  )
}

// ─── Reminder card ─────────────────────────────────────────────────────────────

function ReminderCard({
  reminder,
  onDone,
  onDelete,
}: {
  reminder: Reminder
  onDone: (id: string) => void
  onDelete: (id: string) => void
}) {
  const ev      = getEventType(reminder.typeId)
  const { text, urgency } = countdownLabel(reminder.date)
  const ust     = URGENCY_STYLE[urgency]
  const isPast  = urgency === 'past'
  const port    = reminder.portId ? PORTS.find(p => p.id === reminder.portId) : null

  return (
    <div
      className="glass-card p-4 transition-all"
      style={{
        borderLeft: `4px solid ${reminder.done ? 'rgba(148,163,184,0.30)' : ev.color}`,
        opacity: reminder.done || isPast ? 0.65 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ background: `${ev.color}18`, border: `1px solid ${ev.color}30` }}
        >
          {ev.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: ev.color }}
              >
                {ev.label}
              </span>
              <h3
                className="font-display font-semibold text-sm mt-0.5"
                style={{
                  color: reminder.done ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: reminder.done ? 'line-through' : 'none',
                }}
              >
                {reminder.title}
              </h3>
            </div>

            {/* Countdown badge */}
            <span
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{
                background: ust.bg,
                color:      ust.color,
                border:     `1px solid ${ust.border}`,
              }}
            >
              {reminder.done ? '✓ Done' : text}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDisplayDate(reminder.date, reminder.time)}
            </span>
            {port && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {port.name}
              </span>
            )}
          </div>

          {/* Note */}
          {reminder.note && (
            <p
              className="mt-2 text-xs flex items-start gap-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              <FileText className="w-3 h-3 flex-shrink-0 mt-0.5" />
              {reminder.note}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={() => onDone(reminder.id)}
            title={reminder.done ? 'Mark as pending' : 'Mark as done'}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: reminder.done ? 'rgba(52,211,153,0.18)' : 'var(--bg-card)',
              border: `1px solid ${reminder.done ? 'rgba(52,211,153,0.40)' : 'var(--border)'}`,
              color: reminder.done ? '#34d399' : 'var(--text-muted)',
            }}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(reminder.id)}
            title="Delete"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Reminder Form ────────────────────────────────────────────────────────

const CATEGORIES: EventCategory[] = ['shipyard', 'tide', 'fishing', 'custom']

function AddReminderForm({ onAdded }: { onAdded: () => void }) {
  const [open,     setOpen]     = useState(false)
  const [typeId,   setTypeId]   = useState(EVENT_TYPES[0].id)
  const [title,    setTitle]    = useState('')
  const [date,     setDate]     = useState(todayISTStr())
  const [time,     setTime]     = useState('')
  const [portId,   setPortId]   = useState('')
  const [note,     setNote]     = useState('')
  const [saved,    setSaved]    = useState(false)

  const selectedType = getEventType(typeId)

  function handleSave() {
    if (!title.trim() || !date) return
    addReminder({
      typeId,
      title: title.trim(),
      portId: portId || undefined,
      date,
      time: time || undefined,
      note: note.trim() || undefined,
    })
    // Reset
    setTitle('')
    setTime('')
    setNote('')
    setPortId('')
    setDate(todayISTStr())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onAdded()
  }

  return (
    <div className="glass-card overflow-hidden" style={{ borderTop: `3px solid var(--accent-blue)` }}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-5"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand-gradient)' }}>
            <Plus className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add Event Reminder
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5" style={{ borderTop: '1px solid var(--border)' }}>

          {/* Event Type — grouped by category */}
          <div className="pt-4">
            <label className="block text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>
              EVENT TYPE
            </label>
            <div className="space-y-3">
              {CATEGORIES.map(cat => (
                <div key={cat}>
                  <div
                    className="text-xs font-mono font-semibold mb-2"
                    style={{ color: CATEGORY_COLOR[cat] }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.filter(e => e.category === cat).map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => setTypeId(ev.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={typeId === ev.id
                          ? { background: `${ev.color}22`, border: `1px solid ${ev.color}66`, color: ev.color }
                          : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                      >
                        <span>{ev.icon}</span> {ev.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
              TITLE <span style={{ color: 'var(--accent-blue)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`e.g. MV Vikrant — ${selectedType.label}`}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-accent)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
                DATE (IST) <span style={{ color: 'var(--accent-blue)' }}>*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-accent)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
                TIME (IST) <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>OPTIONAL</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Port selector */}
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
              PORT / LOCATION <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>OPTIONAL</span>
            </label>
            <select
              value={portId}
              onChange={e => setPortId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm appearance-none"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: portId ? 'var(--text-primary)' : 'var(--text-muted)',
                outline: 'none',
              }}
            >
              <option value="">— No specific port —</option>
              {PORTS.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.state}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
              NOTE <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>OPTIONAL</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Align with HW at Dahej — check tidal window"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!title.trim() || !date}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: (!title.trim() || !date) ? 'var(--border)' : 'var(--brand-gradient)',
              color: (!title.trim() || !date) ? 'var(--text-muted)' : '#ffffff',
              cursor: (!title.trim() || !date) ? 'not-allowed' : 'pointer',
              boxShadow: (!title.trim() || !date) ? 'none' : '0 2px 12px rgba(10,150,150,0.32)',
            }}
          >
            {saved ? '✓ Reminder Saved!' : `Save ${selectedType.icon} ${selectedType.label} Reminder`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [tab,       setTab]       = useState<FilterTab>('upcoming')
  const [mounted,   setMounted]   = useState(false)

  const reload = () => setReminders(loadReminders())

  useEffect(() => {
    setMounted(true)
    setReminders(loadReminders())
  }, [])

  function handleDone(id: string) {
    const r = reminders.find(r => r.id === id)
    if (r) updateReminder(id, { done: !r.done })
    reload()
  }
  function handleDelete(id: string) {
    deleteReminder(id)
    reload()
  }

  const today = todayISTStr()

  const filtered = useMemo(() => {
    const sorted = [...reminders].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    switch (tab) {
      case 'today':    return sorted.filter(r => !r.done && r.date === today)
      case 'upcoming': return sorted.filter(r => !r.done && r.date >= today)
      case 'past':     return sorted.filter(r => !r.done && r.date < today)
      case 'done':     return sorted.filter(r => r.done)
      default:         return sorted
    }
  }, [reminders, tab, today])

  // Stats
  const countToday    = reminders.filter(r => !r.done && r.date === today).length
  const countUpcoming = reminders.filter(r => !r.done && r.date > today).length
  const countTotal    = reminders.filter(r => !r.done).length

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="ocean-bg relative py-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(10,150,150,0.18) 0%, transparent 60%)' }} />
        <div className="container-tp relative z-10">
          <div className="section-tag mb-5"
            style={{ color: 'rgba(255,255,255,0.90)', background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.30)' }}>
            <Bell className="w-3 h-3" /> Event Reminders
          </div>
          <h1 className="font-display font-bold mb-2"
            style={{ fontSize: 'clamp(1.6rem,3.5vw,2.5rem)', color: '#ffffff' }}>
            <span className="hero-gradient-text">Tide-Aware</span> Event Planner
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 520 }}>
            Schedule dockings, launchings, fishing windows, sea trials and more.
            All dates shown in IST. Email reminders coming soon.
          </p>

          {/* Stats row */}
          {mounted && (
            <div className="flex gap-4 mt-6">
              {[
                { label: 'TODAY',    value: countToday,    color: '#f59e0b' },
                { label: 'UPCOMING', value: countUpcoming, color: '#0DC8C8' },
                { label: 'TOTAL',    value: countTotal,    color: 'var(--accent-cyan)' },
              ].map(s => (
                <div key={s.label}
                  className="glass-card px-4 py-2.5 text-center"
                  style={{ minWidth: 72 }}
                >
                  <div className="font-mono font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <section className="py-8">
        <div className="container-tp space-y-6">

          {/* Add Form */}
          <AddReminderForm onAdded={reload} />

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(t => {
              const count = t.id === 'today'    ? countToday
                          : t.id === 'upcoming' ? countUpcoming
                          : t.id === 'all'      ? reminders.length
                          : t.id === 'done'     ? reminders.filter(r => r.done).length
                          : reminders.filter(r => !r.done && r.date < today).length
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all"
                  style={tab === t.id
                    ? { background: 'var(--brand-gradient)', color: '#fff', boxShadow: '0 2px 10px rgba(10,150,150,0.32)' }
                    : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  {t.label}
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{
                      background: tab === t.id ? 'rgba(255,255,255,0.20)' : 'var(--border)',
                      color: tab === t.id ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Reminder list */}
          {!mounted ? (
            <div className="text-xs font-mono text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Loading reminders…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <div className="space-y-3">
              {filtered.map(r => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onDone={handleDone}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Email reminder note */}
          <div
            className="glass-card p-4 flex items-start gap-3 text-xs"
            style={{ borderLeft: '3px solid rgba(0,191,255,0.40)' }}
          >
            <span style={{ fontSize: '1.1rem' }}>📧</span>
            <div style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Email reminders coming soon.</span>
              {' '}In the next update you will be able to enter your email and receive automatic reminders
              before each event — 7 days, 3 days, and 1 day ahead.
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 mt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="container-tp text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          <p>TidePilot · Reminders are stored locally on your device</p>
          <p className="mt-1">
            Built by{' '}
            <a href="https://sujikumar.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent-cyan)' }}>
              Suji Kumar C
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
