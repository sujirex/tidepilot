'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { PORTS } from '@/lib/ports'
import { dailyHWLW, tidalPhase, toIST } from '@/lib/tideEngine'

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  'Spring':       { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.32)'  },
  'Near Spring':  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.32)'  },
  'Intermediate': { color: '#0DC8C8', bg: 'rgba(10,150,150,0.10)',  border: 'rgba(10,150,150,0.32)'  },
  'Near Neap':    { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.28)'  },
  'Neap':         { color: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.28)' },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayUTCStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function parseUTC(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Return ISO date string of the Monday of the week containing dateStr */
function getMondayOf(dateStr: string): string {
  const d = parseUTC(dateStr)
  const day  = d.getUTCDay()            // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // shift back to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WeeklyPage() {
  const { timeFormat } = useTheme()
  const [portId, setPortId]       = useState('dahej')
  const [weekStart, setWeekStart] = useState(() => getMondayOf(todayUTCStr()))

  const port  = PORTS.find(p => p.id === portId) ?? PORTS[0]
  const today = todayUTCStr()

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = parseUTC(weekStart)
      d.setUTCDate(d.getUTCDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const events  = dailyHWLW(d, port.constituents)
      const phase   = tidalPhase(d)
      const ps      = PHASE_STYLE[phase] ?? PHASE_STYLE['Intermediate']
      const hw      = events.filter(e => e.type === 'HW')
      const lw      = events.filter(e => e.type === 'LW')
      const label   = d.toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short' })
      const dayName = DAY_NAMES[d.getUTCDay()]
      return { dateStr, label, dayName, hw, lw, phase, ps, isToday: dateStr === today }
    })
  }, [weekStart, port, today])

  function shiftWeek(n: number) {
    const d = parseUTC(weekStart)
    d.setUTCDate(d.getUTCDate() + n * 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }

  const weekEndDate = parseUTC(weekStart)
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
  const weekLabel = [
    parseUTC(weekStart).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' }),
    weekEndDate.toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }),
  ].join(' – ')

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      {/* Hero */}
      <div className="ocean-bg py-10">
        <div className="container-tp">
          <span className="section-tag mb-3"
            style={{ color: 'rgba(255,255,255,0.90)', background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}>
            🗓️ Weekly View
          </span>
          <h1 className="font-display font-bold text-3xl mt-2 hero-gradient-text">7-Day Tide Planner</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Plan operations across the week — at a glance
          </p>
        </div>
      </div>

      <div className="container-tp py-6 space-y-5">

        {/* Controls */}
        <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
          <select value={portId} onChange={e => setPortId(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {PORTS.map(p => <option key={p.id} value={p.id}>{p.name} — {p.state}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftWeek(-1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-sm px-2 text-center min-w-[200px]" style={{ color: 'var(--text-primary)' }}>
              {weekLabel}
            </span>
            <button onClick={() => shiftWeek(1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setWeekStart(getMondayOf(todayUTCStr()))}
            className="px-3 py-2 rounded-lg text-xs font-mono font-semibold hover:opacity-80"
            style={{ background: 'rgba(10,150,150,0.14)', border: '1px solid rgba(10,150,150,0.32)', color: '#0DC8C8' }}>
            This Week
          </button>
        </div>

        {/* 7-day rows */}
        <div className="glass-card overflow-hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {weekDays.map(day => (
            <div key={day.dateStr}
              className="flex gap-4 px-4 py-3 items-start"
              style={day.isToday ? { background: 'rgba(10,150,150,0.07)' } : {}}>

              {/* Day label */}
              <div className="w-16 flex-shrink-0">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wide"
                  style={{ color: day.isToday ? '#0DC8C8' : 'var(--text-muted)' }}>
                  {day.dayName}
                </div>
                <div className="text-sm font-display font-semibold"
                  style={{ color: day.isToday ? '#0DC8C8' : 'var(--text-primary)' }}>
                  {day.label}
                </div>
                {day.isToday && (
                  <div className="text-[9px] font-mono font-bold mt-0.5" style={{ color: '#0DC8C8' }}>TODAY</div>
                )}
              </div>

              {/* Phase pill */}
              <div className="pt-0.5 w-[104px] flex-shrink-0">
                <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: day.ps.bg, color: day.ps.color, border: `1px solid ${day.ps.border}` }}>
                  {day.phase}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1 pt-0.5">
                {day.hw.map((e, i) => (
                  <span key={`hw${i}`} className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap">
                    <span className="font-bold" style={{ color: '#f59e0b' }}>HW</span>
                    <span style={{ color: 'var(--text-primary)' }}>{toIST(e.time, timeFormat)}</span>
                    <span style={{ color: '#f59e0b' }}>{e.height.toFixed(2)}m</span>
                  </span>
                ))}
                {day.lw.map((e, i) => (
                  <span key={`lw${i}`} className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap">
                    <span className="font-bold" style={{ color: '#38bdf8' }}>LW</span>
                    <span style={{ color: 'var(--text-primary)' }}>{toIST(e.time, timeFormat)}</span>
                    <span style={{ color: '#38bdf8' }}>{e.height.toFixed(2)}m</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {Object.entries(PHASE_STYLE).map(([name, s]) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              {name}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
