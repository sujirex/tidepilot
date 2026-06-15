'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { PORTS } from '@/lib/ports'
import { monthlyHWLW, tidalPhase, toIST } from '@/lib/tideEngine'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const PHASE_STYLE: Record<string, { color: string; dot: string }> = {
  'Spring':       { color: '#f59e0b', dot: '#f59e0b' },
  'Near Spring':  { color: '#fb923c', dot: '#fb923c' },
  'Intermediate': { color: '#0DC8C8', dot: '#0DC8C8' },
  'Near Neap':    { color: '#38bdf8', dot: '#38bdf8' },
  'Neap':         { color: '#818cf8', dot: '#818cf8' },
}

function todayIST(): { year: number; month: number; day: number } {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const [y, m, d] = s.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

export default function MonthlyPage() {
  const { timeFormat } = useTheme()
  const today = useMemo(todayIST, [])
  const [portId, setPortId] = useState('dahej')
  const [year,  setYear]    = useState(today.year)
  const [month, setMonth]   = useState(today.month)

  const port = PORTS.find(p => p.id === portId) ?? PORTS[0]

  const rows = useMemo(() =>
    monthlyHWLW(year, month, port.constituents).map(({ date, events }) => {
      const phase   = tidalPhase(date)
      const ps      = PHASE_STYLE[phase] ?? PHASE_STYLE['Intermediate']
      const hw      = events.filter(e => e.type === 'HW')
      const lw      = events.filter(e => e.type === 'LW')
      const dayNum  = date.getUTCDate()
      const dayName = date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })
      const isToday = year === today.year && month === today.month && dayNum === today.day
      return { date, dayNum, dayName, hw, lw, phase, ps, isToday }
    }),
    [year, month, port, today],
  )

  const allHW      = rows.flatMap(r => r.hw)
  const allLW      = rows.flatMap(r => r.lw)
  const peakHW     = allHW.length ? Math.max(...allHW.map(e => e.height)) : 0
  const lowestLW   = allLW.length ? Math.min(...allLW.map(e => e.height)) : 0
  const springDays = rows.filter(r => r.phase === 'Spring' || r.phase === 'Near Spring').length

  function shiftMonth(delta: number) {
    let m = month + delta, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y)
  }

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      <div className="ocean-bg py-10">
        <div className="container-tp">
          <span className="section-tag mb-3"
            style={{ color: 'rgba(255,255,255,0.90)', background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}>
            MONTHLY VIEW
          </span>
          <h1 className="font-display font-bold text-3xl mt-2 hero-gradient-text">Monthly Tide Table</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Complete HW &amp; LW schedule for any month
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
            <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center px-3 min-w-[160px]">
              <span className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {MONTH_NAMES[month]} {year}
              </span>
            </div>
            <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => { setYear(today.year); setMonth(today.month) }}
            className="px-3 py-2 rounded-lg text-xs font-mono font-semibold hover:opacity-80"
            style={{ background: 'rgba(10,150,150,0.14)', border: '1px solid rgba(10,150,150,0.32)', color: '#0DC8C8' }}>
            This Month
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            { label: 'Peak HW',     value: peakHW.toFixed(2) + ' m',   color: '#f59e0b' },
            { label: 'Lowest LW',   value: lowestLW.toFixed(2) + ' m', color: '#38bdf8' },
            { label: 'Spring Days', value: String(springDays),          color: '#0DC8C8' },
          ] as const).map(stat => (
            <div key={stat.label} className="glass-card p-3 text-center">
              <div className="text-xl font-display font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <th className="px-3 py-2.5 text-left font-mono" style={{ color: 'var(--text-muted)' }}>Date</th>
                  <th className="px-3 py-2.5 text-left font-mono" style={{ color: 'var(--text-muted)' }}>Phase</th>
                  <th className="px-3 py-2.5 text-left font-mono" style={{ color: '#f59e0b' }}>High Water</th>
                  <th className="px-3 py-2.5 text-left font-mono" style={{ color: '#38bdf8' }}>Low Water</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.dayNum}
                    style={{ borderBottom: '1px solid var(--border)', background: row.isToday ? 'rgba(10,150,150,0.07)' : 'transparent' }}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-mono font-bold"
                        style={{ color: row.isToday ? '#0DC8C8' : 'var(--text-primary)' }}>
                        {String(row.dayNum).padStart(2, '0')}
                      </span>
                      <span className="ml-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>{row.dayName}</span>
                      {row.isToday && <span className="ml-1.5 text-[9px] font-mono font-bold" style={{ color: '#0DC8C8' }}>TODAY</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: row.ps.dot }} />
                        <span style={{ color: row.ps.color }}>{row.phase}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        {row.hw.map((e, i) => (
                          <span key={i} className="font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                            {toIST(e.time, timeFormat)}{' '}
                            <span style={{ color: '#f59e0b' }}>{e.height.toFixed(2)}m</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        {row.lw.map((e, i) => (
                          <span key={i} className="font-mono whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                            {toIST(e.time, timeFormat)}{' '}
                            <span style={{ color: '#38bdf8' }}>{e.height.toFixed(2)}m</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
