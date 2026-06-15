'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PORTS } from '@/lib/ports'
import { monthlyHWLW, tidalPhase } from '@/lib/tideEngine'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnualPage() {
  const currentYear = new Date().getFullYear()
  const [portId, setPortId] = useState('dahej')
  const [year,   setYear]   = useState(currentYear)

  const port = PORTS.find(p => p.id === portId) ?? PORTS[0]

  /** Compute per-month extremes — memoised; recomputes only on port/year change */
  const annual = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const days  = monthlyHWLW(year, m, port.constituents)
      const allHW = days.flatMap(d => d.events.filter(e => e.type === 'HW'))
      const allLW = days.flatMap(d => d.events.filter(e => e.type === 'LW'))
      if (!allHW.length || !allLW.length) return null

      const peakHW    = allHW.reduce((a, b) => b.height > a.height ? b : a)
      const lowestLW  = allLW.reduce((a, b) => b.height < a.height ? b : a)
      const range     = (peakHW.height - lowestLW.height).toFixed(2)
      const springDays = days.filter(d => {
        const p = tidalPhase(d.date)
        return p === 'Spring' || p === 'Near Spring'
      }).length

      // Best use label for the month
      const bestUse = springDays >= 10
        ? 'Launch / Dry-dock'
        : springDays >= 6
          ? 'Operations'
          : 'Sea Trials'

      return { month: m, peakHW, lowestLW, range, springDays, bestUse }
    }).filter((r): r is NonNullable<typeof r> => r !== null)
  }, [year, port])

  // Year-level extremes
  const yearPeakHW   = annual.length ? Math.max(...annual.map(r => r.peakHW.height))   : 0
  const yearLowestLW = annual.length ? Math.min(...annual.map(r => r.lowestLW.height))  : 0

  // Best launch months (top 3 by peak HW)
  const bestLaunchMonths = [...annual]
    .sort((a, b) => b.peakHW.height - a.peakHW.height)
    .slice(0, 3)
    .map(r => MONTH_SHORT[r.month])
    .join(', ')

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      {/* Hero */}
      <div className="ocean-bg py-10">
        <div className="container-tp">
          <span className="section-tag mb-3"
            style={{ color: 'rgba(255,255,255,0.90)', background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}>
            📆 Annual View
          </span>
          <h1 className="font-display font-bold text-3xl mt-2 hero-gradient-text">Annual Tide Tables</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Year-round tidal extremes — for shipbuilding, dry-dock &amp; launch planning
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
          <div className="flex items-center gap-3">
            <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display font-bold text-xl px-3" style={{ color: 'var(--text-primary)' }}>
              {year}
            </span>
            <button onClick={() => setYear(y => y + 1)} className="p-2 rounded-lg hover:opacity-80"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => setYear(currentYear)}
            className="px-3 py-2 rounded-lg text-xs font-mono font-semibold hover:opacity-80"
            style={{ background: 'rgba(10,150,150,0.14)', border: '1px solid rgba(10,150,150,0.32)', color: '#0DC8C8' }}>
            This Year
          </button>
        </div>

        {/* Year summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3 text-center">
            <div className="text-xl font-display font-bold" style={{ color: '#f59e0b' }}>{yearPeakHW.toFixed(2)} m</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Highest HW of Year</div>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="text-xl font-display font-bold" style={{ color: '#38bdf8' }}>{yearLowestLW.toFixed(2)} m</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Lowest LW of Year</div>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="text-base font-display font-bold" style={{ color: '#0DC8C8' }}>{bestLaunchMonths}</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Best Launch Months</div>
          </div>
        </div>

        {/* Shipbuilding notes panel */}
        <div className="glass-card p-4"
          style={{ background: 'rgba(10,150,150,0.06)', border: '1px solid rgba(13,200,200,0.22)' }}>
          <h3 className="font-mono text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: '#0DC8C8' }}>
            ⚓ Shipbuilding Planning Guide
          </h3>
          <div className="grid grid-cols-1 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex gap-2">
              <span style={{ color: '#f59e0b', flexShrink: 0 }}>▲</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>Launch window</strong> — Use spring HW months ({bestLaunchMonths}) for maximum water depth during float-out</span>
            </div>
            <div className="flex gap-2">
              <span style={{ color: '#38bdf8', flexShrink: 0 }}>▼</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>Dry-dock entry / exit</strong> — Spring tides give both maximum HW (for floating in) and lowest LW (for hull exposure)</span>
            </div>
            <div className="flex gap-2">
              <span style={{ color: '#818cf8', flexShrink: 0 }}>≈</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>Sea trials</strong> — Neap periods give calmer, more predictable tidal streams for manoeuvring trials</span>
            </div>
            <div className="flex gap-2">
              <span style={{ color: '#0DC8C8', flexShrink: 0 }}>◎</span>
              <span><strong style={{ color: 'var(--text-primary)' }}>HAT / LAT planning</strong> — Highest and lowest values in the table approximate HAT/LAT for the year — compare against vessel air-draft and keel clearance</span>
            </div>
          </div>
        </div>

        {/* 12-month table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <th className="px-4 py-2.5 text-left font-mono"  style={{ color: 'var(--text-muted)' }}>Month</th>
                  <th className="px-4 py-2.5 text-right font-mono" style={{ color: '#f59e0b' }}>Peak HW (m)</th>
                  <th className="px-4 py-2.5 text-right font-mono" style={{ color: '#38bdf8' }}>Lowest LW (m)</th>
                  <th className="px-4 py-2.5 text-right font-mono" style={{ color: '#0DC8C8' }}>Range (m)</th>
                  <th className="px-4 py-2.5 text-right font-mono" style={{ color: '#f59e0b' }}>Spring Days</th>
                  <th className="px-4 py-2.5 text-left font-mono"  style={{ color: 'var(--text-muted)' }}>Best Use</th>
                </tr>
              </thead>
              <tbody>
                {annual.map(row => {
                  const isYearPeak = row.peakHW.height   === yearPeakHW
                  const isYearLow  = row.lowestLW.height === yearLowestLW
                  return (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-2.5 font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {MONTH_SHORT[row.month]}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        <span style={{ color: isYearPeak ? '#f59e0b' : 'var(--text-primary)', fontWeight: isYearPeak ? 700 : 400 }}>
                          {row.peakHW.height.toFixed(2)}
                        </span>
                        {isYearPeak && <span className="ml-1 text-[9px] font-bold" style={{ color: '#f59e0b' }}>▲HAT</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        <span style={{ color: isYearLow ? '#38bdf8' : 'var(--text-primary)', fontWeight: isYearLow ? 700 : 400 }}>
                          {row.lowestLW.height.toFixed(2)}
                        </span>
                        {isYearLow && <span className="ml-1 text-[9px] font-bold" style={{ color: '#38bdf8' }}>▼LAT</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {row.range}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        <span style={{ color: row.springDays >= 10 ? '#f59e0b' : 'var(--text-secondary)' }}>
                          {row.springDays}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono"
                        style={{ color: row.bestUse === 'Launch / Dry-dock' ? '#0DC8C8' : 'var(--text-muted)' }}>
                        {row.bestUse}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          Harmonic prediction · {port.source} · MHWS {port.mhws} m · MLWS {port.mlws} m ·
          Verify against current NHO India Tide Tables for navigation-critical decisions.
        </p>

      </div>
    </div>
  )
}
