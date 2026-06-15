'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { PORTS } from '@/lib/ports'
import { dailyTidePoints, dailyHWLW, tidalPhase, toIST } from '@/lib/tideEngine'

const PHASE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  'Spring':       { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.32)'  },
  'Near Spring':  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.32)'  },
  'Intermediate': { color: '#0DC8C8', bg: 'rgba(10,150,150,0.10)',  border: 'rgba(10,150,150,0.32)'  },
  'Near Neap':    { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.28)'  },
  'Neap':         { color: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.28)' },
}

function todayUTCStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function parseUTC(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export default function DailyPage() {
  const { timeFormat } = useTheme()
  const [portId, setPortId]   = useState('dahej')
  const [dateStr, setDateStr] = useState(todayUTCStr)

  const port    = PORTS.find(p => p.id === portId) ?? PORTS[0]
  const dateUTC = useMemo(() => parseUTC(dateStr), [dateStr])

  const chartPoints = useMemo(() =>
    dailyTidePoints(dateUTC, port.constituents, 10).map(p => ({
      t: toIST(p.time, '24h'),
      h: p.height,
    })), [dateUTC, port])

  const events = useMemo(() => dailyHWLW(dateUTC, port.constituents), [dateUTC, port])
  const phase  = tidalPhase(dateUTC)
  const ps     = PHASE_STYLE[phase] ?? PHASE_STYLE['Intermediate']

  const heights = chartPoints.map(p => p.h)
  const maxH    = Math.max(...heights)
  const minH    = Math.min(...heights)
  const midH    = ((maxH + minH) / 2).toFixed(2)

  function shift(days: number) {
    const d = parseUTC(dateStr)
    d.setUTCDate(d.getUTCDate() + days)
    setDateStr(d.toISOString().slice(0, 10))
  }

  const dateLabel = dateUTC.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      <div className="ocean-bg py-10">
        <div className="container-tp">
          <span className="section-tag mb-3"
            style={{ color: 'rgba(255,255,255,0.90)', background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}>
            DAILY TIDES
          </span>
          <h1 className="font-display font-bold text-3xl mt-2 hero-gradient-text">Daily Tide Chart</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Full 24-hour tide prediction — any port, any date
          </p>
        </div>
      </div>

      <div className="container-tp py-6 space-y-5">

        <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
          <select value={portId} onChange={e => setPortId(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {PORTS.map(p => <option key={p.id} value={p.id}>{p.name} — {p.state}</option>)}
          </select>
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
          <button onClick={() => setDateStr(todayUTCStr())}
            className="px-3 py-2 rounded-lg text-xs font-mono font-semibold hover:opacity-80"
            style={{ background: 'rgba(10,150,150,0.14)', border: '1px solid rgba(10,150,150,0.32)', color: '#0DC8C8' }}>
            Today
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{dateLabel}</span>
          <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full"
            style={{ background: ps.bg, color: ps.color, border: '1px solid ' + ps.border }}>
            {phase} Tide
          </span>
          <span className="font-mono text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            Range: {minH.toFixed(2)} - {maxH.toFixed(2)} m
          </span>
        </div>

        <div className="glass-card p-4" style={{ height: 290 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0A9696" stopOpacity={0.48} />
                  <stop offset="95%" stopColor="#0A9696" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} interval={17} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} tickFormatter={v => v + 'm'} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v.toFixed(2) + ' m', 'Height']}
                labelStyle={{ color: 'var(--text-muted)' }} />
              <ReferenceLine y={Number(midH)} stroke="rgba(13,200,200,0.22)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="h" stroke="#0A9696" strokeWidth={2.5}
                fill="url(#dailyGrad)" dot={false} activeDot={{ r: 4, fill: '#0DC8C8', stroke: 'none' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              High &amp; Low Water Events
            </h2>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{events.length} events</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {events.map((ev, i) => {
              const isHW = ev.type === 'HW'
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: isHW ? 'rgba(245,158,11,0.14)' : 'rgba(56,189,248,0.14)',
                               color: isHW ? '#f59e0b' : '#38bdf8' }}>
                      {isHW ? String.fromCharCode(9650) : String.fromCharCode(9660)}
                    </span>
                    <div>
                      <div className="text-xs font-mono font-semibold" style={{ color: isHW ? '#f59e0b' : '#38bdf8' }}>
                        {isHW ? 'High Water' : 'Low Water'}
                      </div>
                      <div className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {toIST(ev.time, timeFormat)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                      {ev.height.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>metres</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass-card p-4">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {port.note ?? port.fullName}
          </p>
          <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--text-muted)', opacity: 0.65 }}>
            MHWS {port.mhws} m · MLWS {port.mlws} m · Spring range ~{port.springRange} m · Source: {port.source}
          </p>
        </div>

      </div>
    </div>
  )
}
