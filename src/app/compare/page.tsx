'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { PORTS } from '@/lib/ports'
import { dailyTidePoints, dailyHWLW, tidalPhase, toIST } from '@/lib/tideEngine'
import type { HWLWEvent } from '@/lib/tideEngine'

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_STYLE: Record<string, { color: string; bg: string }> = {
  'Spring':       { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  'Near Spring':  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  'Intermediate': { color: '#0DC8C8', bg: 'rgba(10,150,150,0.10)'  },
  'Near Neap':    { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)'  },
  'Neap':         { color: '#818cf8', bg: 'rgba(129,140,248,0.10)' },
}

// Port A = teal, Port B = indigo/purple
const COLOR_A = '#0A9696'
const COLOR_B = '#818cf8'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayUTCStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function parseUTC(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventList({ events, color, timeFormat }: {
  events: HWLWEvent[]
  color: string
  timeFormat: '24h' | '12h'
}) {
  return (
    <div className="space-y-1.5">
      {events.map((ev, i) => {
        const isHW = ev.type === 'HW'
        return (
          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl"
            style={{ background: isHW ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold"
                style={{ color: isHW ? '#f59e0b' : '#38bdf8' }}>
                {isHW ? '▲ HW' : '▼ LW'}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {toIST(ev.time, timeFormat)}
              </span>
            </div>
            <span className="font-display font-bold text-sm" style={{ color }}>
              {ev.height.toFixed(2)} m
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { timeFormat } = useTheme()
  const [portAId, setPortAId] = useState('dahej')
  const [portBId, setPortBId] = useState('bhavnagar')
  const [dateStr, setDateStr]  = useState(todayUTCStr)

  const portA   = PORTS.find(p => p.id === portAId) ?? PORTS[0]
  const portB   = PORTS.find(p => p.id === portBId) ?? PORTS[1]
  const dateUTC = useMemo(() => parseUTC(dateStr), [dateStr])

  // Chart data: merge both port heights into one array keyed by IST time
  const chartData = useMemo(() => {
    const ptsA = dailyTidePoints(dateUTC, portA.constituents, 10)
    const ptsB = dailyTidePoints(dateUTC, portB.constituents, 10)
    return ptsA.map((p, i) => ({
      t: toIST(p.time, '24h'),
      a: p.height,
      b: ptsB[i]?.height ?? 0,
    }))
  }, [dateUTC, portA, portB])

  const eventsA = useMemo(() => dailyHWLW(dateUTC, portA.constituents), [dateUTC, portA])
  const eventsB = useMemo(() => dailyHWLW(dateUTC, portB.constituents), [dateUTC, portB])

  const phase = tidalPhase(dateUTC)
  const ps    = PHASE_STYLE[phase] ?? PHASE_STYLE['Intermediate']

  function shift(days: number) {
    const d = parseUTC(dateStr)
    d.setUTCDate(d.getUTCDate() + days)
    setDateStr(d.toISOString().slice(0, 10))
  }

  const dateLabel = dateUTC.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  // Tide offset between the two ports at peak HW
  const peakA    = eventsA.filter(e => e.type === 'HW').map(e => e.height)
  const peakB    = eventsB.filter(e => e.type === 'HW').map(e => e.height)
  const avgPeakA = peakA.length ? (peakA.reduce((s, v) => s + v, 0) / peakA.length) : 0
  const avgPeakB = peakB.length ? (peakB.reduce((s, v) => s + v, 0) / peakB.length) : 0
  const hwDiff   = (avgPeakA - avgPeakB).toFixed(2)

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      {/* Hero */}
      <div className="ocean-bg py-10">
        <div className="container-tp">
          <span className="section-tag mb-3"
            style={{ color: 'rgba(255,255,255,0.90)', background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}>
            ⚡ Compare
          </span>
          <h1 className="font-display font-bold text-3xl mt-2 hero-gradient-text">Port Comparison</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Side-by-side tidal analysis for two Indian ports
          </p>
        </div>
      </div>

      <div className="container-tp py-6 space-y-5">

        {/* Controls */}
        <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
          {/* Port A */}
          <select value={portAId} onChange={e => setPortAId(e.target.value)}
            className="flex-1 min-w-[150px] rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--bg-card)', border: `1.5px solid ${COLOR_A}`, color: 'var(--text-primary)' }}>
            {PORTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-muted)' }}>vs</span>

          {/* Port B */}
          <select value={portBId} onChange={e => setPortBId(e.target.value)}
            className="flex-1 min-w-[150px] rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--bg-card)', border: `1.5px solid ${COLOR_B}`, color: 'var(--text-primary)' }}>
            {PORTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Date */}
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm font-mono"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <button onClick={() => shift(1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date + phase + diff summary */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {dateLabel}
          </span>
          <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full"
            style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.color}35` }}>
            {phase} Tide
          </span>
          {avgPeakA > 0 && avgPeakB > 0 && (
            <span className="font-mono text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
              HW offset: <span style={{ color: Number(hwDiff) >= 0 ? COLOR_A : COLOR_B }}>
                {Number(hwDiff) >= 0 ? '+' : ''}{hwDiff} m
              </span>
              {' '}({portA.name} vs {portB.name})
            </span>
          )}
        </div>

        {/* Dual chart */}
        <div className="glass-card p-4" style={{ height: 270 }}>
          {/* Legend */}
          <div className="flex gap-4 mb-3">
            {[{ label: portA.name, color: COLOR_A }, { label: portB.name, color: COLOR_B }].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-6 h-0.5 rounded" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height="88%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="cmpGradA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLOR_A} stopOpacity={0.38} />
                  <stop offset="95%" stopColor={COLOR_A} stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="cmpGradB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLOR_B} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={COLOR_B} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} interval={17} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} tickFormatter={v => `${v}m`} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, key: string) => [
                  `${v.toFixed(2)} m`,
                  key === 'a' ? portA.name : portB.name,
                ]}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Area type="monotone" dataKey="a" stroke={COLOR_A} strokeWidth={2.5}
                fill="url(#cmpGradA)" dot={false} activeDot={{ r: 4, fill: '#0DC8C8', stroke: 'none' }} />
              <Area type="monotone" dataKey="b" stroke={COLOR_B} strokeWidth={2}
                fill="url(#cmpGradB)" dot={false} activeDot={{ r: 4, fill: COLOR_B, stroke: 'none' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Side-by-side HW/LW panels */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* Port A */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLOR_A }} />
              <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {portA.name}
              </h3>
              <span className="font-mono text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                Spring {portA.springRange} m
              </span>
            </div>
            <EventList events={eventsA} color="#0DC8C8" timeFormat={timeFormat} />
            <p className="font-mono text-[10px] mt-3" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              MHWS {portA.mhws} m · MLWS {portA.mlws} m
            </p>
          </div>

          {/* Port B */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLOR_B }} />
              <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {portB.name}
              </h3>
              <span className="font-mono text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                Spring {portB.springRange} m
              </span>
            </div>
            <EventList events={eventsB} color={COLOR_B} timeFormat={timeFormat} />
            <p className="font-mono text-[10px] mt-3" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              MHWS {portB.mhws} m · MLWS {portB.mlws} m
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
