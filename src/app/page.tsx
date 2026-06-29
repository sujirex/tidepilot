'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot,
} from 'recharts'
import {
  Navigation, TrendingUp, TrendingDown, Clock,
  ChevronLeft, ChevronRight, Droplets, Calendar,
} from 'lucide-react'
import { PORTS, PORTS_BY_REGION, REGION_LABELS, DEFAULT_PORT_ID } from '@/lib/ports'
import {
  dailyTidePoints, dailyHWLW, tideHeight, toIST,
  tidalPhase, type HWLWEvent, type TidalPhase,
} from '@/lib/tideEngine'
import { useTheme } from '@/context/ThemeContext'
import { loadReminders, countdownLabel, getEventType, todayISTStr, type Reminder } from '@/lib/reminders'
import TideChat from '@/components/TideChat'

const PORT_SOURCE_LABEL: Record<string, string> = {
  direct:          'Harmonic (ATT/NHO)',
  'nho-secondary': 'NHO Secondary Port',
  tpxo:            'TPXO9 Model',
  proxy:           'Hazira Proxy',
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** UTC midnight that represents "today" in IST */
function todayIST(): Date {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()))
}

/** Format a countdown duration (ms) as "Xh Ym" or "Ym" */
function fmtCountdown(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Nearest 30-min label (24h "HH:MM") in IST â€” for matching chart axis keys */
function nearestChartLabel(date: Date): string {
  const ist  = new Date(date.getTime() + 5.5 * 3_600_000)
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes()
  const r    = Math.round(mins / 30) * 30
  const h    = Math.floor(r / 60) % 24
  const m    = r % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TideTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-accent)',
      borderRadius: 8,
      padding: '6px 12px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '0.72rem',
      color: 'var(--text-primary)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{payload[0].value.toFixed(2)} m</div>
    </div>
  )
}

const PHASE_STYLE: Record<TidalPhase, { bg: string; color: string; border: string }> = {
  'Spring':       { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.40)' },
  'Near Spring':  { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  'Intermediate': { bg: 'rgba(10,150,150,0.10)',  color: '#0DC8C8', border: 'rgba(10,150,150,0.30)' },
  'Near Neap':    { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.35)' },
  'Neap':         { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'rgba(56,189,248,0.35)' },
}

// â”€â”€â”€ Live Indian Coast Links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COAST_LINKS = [
  {
    icon: 'ðŸŒŠ',
    label: 'INCOIS Ocean Services',
    sub: 'Waves Â· Currents Â· Tsunami alerts',
    url: 'https://incois.gov.in/site/index.jsp',
    color: '#0DC8C8',
  },
  {
    icon: 'ðŸŒ§ï¸',
    label: 'IMD Weather Warnings',
    sub: 'Storm Â· Wind Â· Rain bulletins',
    url: 'https://mausam.imd.gov.in/',
    color: '#f97316',
  },
  {
    icon: 'ðŸŒ€',
    label: 'IMD Weather & Cyclone',
    sub: 'Storm Â· Cyclone Â· Weather warnings',
    url: 'https://mausam.imd.gov.in/index_en.php',
    color: '#ef4444',
  },
  {
    icon: 'âš“',
    label: 'Indian Coast Guard',
    sub: 'Maritime safety Â· Distress alerts',
    url: 'https://www.indiancoastguard.gov.in/',
    color: '#f59e0b',
  },
]

function LiveCoastLinks() {
  return (
    <section style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
      <div className="container-tp py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
          <span className="font-mono font-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.10em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Live Indian Coast â€” View on Official Sources
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {COAST_LINKS.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl transition-all hover:opacity-75"
              style={{
                padding: '10px 14px',
                background: `${link.color}0D`,
                border: `1px solid ${link.color}28`,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{link.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1 font-semibold" style={{ fontSize: '0.8rem', color: link.color }}>
                  {link.label}
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
                    <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="font-mono truncate" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {link.sub}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Mini strip showing next 3 upcoming reminders (client-only) */
function MiniRemindersStrip() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const today = todayISTStr()

  useEffect(() => {
    const upcoming = loadReminders()
      .filter(r => !r.done && r.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
      .slice(0, 3)
    setReminders(upcoming)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (reminders.length === 0) return null

  return (
    <div style={{ background: 'rgba(2,13,13,0.50)', borderBottom: '1px solid rgba(10,150,150,0.22)' }}>
      <div className="container-tp py-2">
        <div className="flex items-center gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[10px] font-mono font-semibold flex-shrink-0" style={{ color: 'var(--accent-cyan)' }}>
            UPCOMING
          </span>
          {reminders.map(r => {
            const ev = getEventType(r.typeId)
            const { text, urgency } = countdownLabel(r.date)
            const badgeColor = urgency === 'today' ? '#f59e0b' : urgency === 'soon' ? '#34d399' : '#60a5fa'
            return (
              <a
                key={r.id}
                href="/reminders"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0 transition-opacity hover:opacity-80"
                style={{
                  background: `${ev.color}14`,
                  border: `1px solid ${ev.color}30`,
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>{ev.icon}</span>
                <span className="text-[11px] font-medium max-w-[120px] truncate" style={{ color: '#ddeeff' }}>
                  {r.title}
                </span>
                <span className="text-[10px] font-mono font-bold" style={{ color: badgeColor }}>
                  {text}
                </span>
              </a>
            )
          })}
          <a
            href="/reminders"
            className="text-[10px] font-mono flex-shrink-0 ml-auto transition-opacity hover:opacity-80"
            style={{ color: 'var(--accent-cyan)' }}
          >
            View all â†’
          </a>
        </div>
      </div>
    </div>
  )
}

/** Decorative wave emblem (hero watermark) */
function HeroEmblem() {
  return (
    <svg width="180" height="180" viewBox="0 0 32 32" fill="none"
      aria-hidden="true"
      style={{ position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)', opacity: 0.08 }}>
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A9696" />
          <stop offset="100%" stopColor="#0DC8C8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#heroGrad)" />
      <path d="M4 13 C8.5 8, 12 18, 16 13 C20 8, 23.5 18, 28 13"
        stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 21 C8.5 15, 12 26, 16 21 C20 15, 23.5 26, 28 21"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function HomePage() {
  const { timeFormat } = useTheme()

  const [portId,       setPortId]       = useState(DEFAULT_PORT_ID)
  const [mounted,      setMounted]      = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(Date.UTC(2000, 0, 1)))
  const [now,          setNow]          = useState(new Date())
  const [hwlw,         setHwlw]        = useState<HWLWEvent[]>([])
  const [chartData,    setChart]        = useState<{ label: string; h: number }[]>([])

  const port = useMemo(() => PORTS.find(p => p.id === portId)!, [portId])

  // Init: set to today in IST after hydration
  useEffect(() => {
    setMounted(true)
    setSelectedDate(todayIST())
  }, [])

  // Tick "now" every minute to keep live data fresh
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Recompute chart + HW/LW when port or selected date changes
  useEffect(() => {
    if (!mounted) return
    const points = dailyTidePoints(selectedDate, port.constituents, 30)
    setChart(points.map(p => ({
      label: toIST(p.time),   // 24h always for chart axis keys
      h:     p.height,
    })))
    setHwlw(dailyHWLW(selectedDate, port.constituents))
  }, [portId, port.constituents, mounted, selectedDate])

  // True when the displayed date matches today IST
  const isToday = useMemo(() => {
    if (!mounted) return false
    return selectedDate.getTime() === todayIST().getTime()
  }, [mounted, selectedDate])

  // Live current tide height â€” only when viewing today
  const currentHeight = useMemo(() => {
    if (!mounted || !isToday) return null
    return tideHeight(now, port.constituents)
  }, [now, mounted, isToday, port.constituents])

  // Fill level relative to MHWS (0â€“100)
  const fillPct = currentHeight !== null
    ? Math.min(100, Math.round((currentHeight / port.mhws) * 100))
    : null

  // Next HW or LW from current moment
  const nextEvent = useMemo(() => {
    if (!mounted) return null
    if (isToday) return hwlw.find(e => e.time > now) ?? hwlw[hwlw.length - 1] ?? null
    return hwlw[0] ?? null
  }, [hwlw, mounted, now, isToday])

  // Countdown string to next event (only when today and event is future)
  const countdown = useMemo(() => {
    if (!nextEvent || !isToday) return null
    const diff = nextEvent.time.getTime() - now.getTime()
    return diff > 0 ? fmtCountdown(diff) : null
  }, [nextEvent, now, isToday])

  // Tidal phase (spring / neap)
  const phase = useMemo(() => tidalPhase(selectedDate), [selectedDate])

  // 24h label for the "now" reference line on the chart
  const nowLabel = useMemo(() => isToday ? nearestChartLabel(now) : '', [now, isToday])

  // HW/LW dot positions on chart (nearest 30-min label)
  const hwlwDots = useMemo(
    () => hwlw.map(ev => ({ ...ev, chartX: nearestChartLabel(ev.time) })),
    [hwlw],
  )

  // Date navigation
  const shiftDate = useCallback((delta: number) => {
    setSelectedDate(d => new Date(d.getTime() + delta * 86_400_000))
  }, [])

  // Displayed date string
  const displayDate = useMemo(() => {
    if (!mounted) return 'â€”'
    return selectedDate.toLocaleDateString('en-IN', {
      timeZone: 'UTC',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }, [selectedDate, mounted])

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="ocean-bg relative py-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(10,150,150,0.14) 0%, transparent 60%)' }} />
        <HeroEmblem />

        <div className="container-tp relative z-10">
          <div className="section-tag mb-5"
            style={{ color: 'rgba(255,255,255,0.90)', background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.30)' }}>
            <svg width="12" height="12" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M4 21 C8.5 15, 12 26, 16 21 C20 15, 23.5 26, 28 21"
                stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            Tide Intelligence
          </div>
          <h1 className="font-display font-bold leading-tight mb-3"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#ffffff' }}>
            <span className="hero-gradient-text">TidePilot</span>
          </h1>
          <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.88)', maxWidth: 480 }}>
            Harmonic tide predictions for 12 major Indian ports â€” Daily, Weekly, Monthly, Annual and Port Comparison.
          </p>
          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.58)' }}>
            NHO Official Â· TPXO9 Global Model Â· Admiralty Tide Tables
          </p>

          {/* AI feature badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 18,
              padding: '8px 16px',
              borderRadius: 24,
              background: 'rgba(13, 200, 200, 0.15)',
              border: '1px solid rgba(13, 200, 200, 0.45)',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ fontSize: '1rem' }}>ðŸ‘‘</span>
            <div>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#0DC8C8',
                letterSpacing: '0.03em',
              }}>
                Ask REX â€” Free AI
              </span>
              <span style={{
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.55)',
                marginLeft: 8,
              }}>
                "High tide at Kandla tomorrow?" Â· Tap ðŸ‘‘ below â†’
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Government Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LiveCoastLinks />

      {/* â”€â”€ Mini Reminders Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {mounted && <MiniRemindersStrip />}

      {/* â”€â”€ Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-6" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="container-tp">
          <div className="flex flex-wrap gap-4 items-end">

            {/* Port selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
                SELECT PORT
              </label>
              <select
                value={portId}
                onChange={e => setPortId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium appearance-none cursor-pointer"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-accent)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                {(Object.keys(PORTS_BY_REGION) as (keyof typeof PORTS_BY_REGION)[]).map(region => (
                  <optgroup key={region} label={REGION_LABELS[region]}>
                    {PORTS_BY_REGION[region].map(p => (
                      <option key={p.id} value={p.id}>{p.name} â€” {p.state}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Date picker */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--text-muted)' }}>
                DATE
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-mono text-center"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-accent)',
                    color: isToday ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  }}
                >
                  {isToday ? 'â–¶ Today' : displayDate}
                </div>
                <button
                  onClick={() => shiftDate(1)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  aria-label="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {!isToday && (
                  <button
                    onClick={() => setSelectedDate(todayIST())}
                    className="px-2 py-2 rounded-lg text-xs font-mono transition-colors"
                    style={{ background: 'rgba(0,212,170,0.10)', border: '1px solid rgba(0,212,170,0.30)', color: 'var(--accent-cyan)' }}
                    aria-label="Go to today"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Port stats + tidal phase */}
            <div className="flex gap-4 text-center items-center">
              <div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>MHWS</div>
                <div className="font-bold text-lg" style={{ color: 'var(--accent-hw)' }}>{port.mhws} m</div>
              </div>
              <div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>MLWS</div>
                <div className="font-bold text-lg" style={{ color: 'var(--accent-lw)' }}>{port.mlws} m</div>
              </div>
              <div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>RANGE</div>
                <div className="font-bold text-lg" style={{ color: 'var(--accent-cyan)' }}>{port.springRange} m</div>
              </div>
              {mounted && (
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-mono font-bold"
                  style={{
                    background: PHASE_STYLE[phase].bg,
                    border:     `1px solid ${PHASE_STYLE[phase].border}`,
                    color:      PHASE_STYLE[phase].color,
                  }}
                >
                  {phase}
                </div>
              )}
            </div>
          </div>

          {port.note && (
            <div className="mt-1 flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Navigation className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-cyan)' }} />
              <span>{port.note}</span>
            </div>
          )}
        </div>
      </section>

      {/* â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-8">
        <div className="container-tp">
          <div className="grid md:grid-cols-[1fr_300px] gap-6">

            {/* â”€â”€ Tide chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {port.fullName}
                  </h2>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {isToday ? "Today's" : displayDate} tide curve Â· IST
                  </p>
                </div>
                <span className="source-pill">{PORT_SOURCE_LABEL[port.source] ?? 'Harmonic'}</span>
              </div>

              {mounted && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData} margin={{ top: 14, right: 10, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0A9696" stopOpacity={0.38} />
                        <stop offset="95%" stopColor="#0A9696" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={false}
                      axisLine={false}
                      interval={5}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${v}m`}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<TideTooltip />} />

                    {/* MSL reference line */}
                    <ReferenceLine
                      y={port.constituents.Z0}
                      stroke="rgba(0,212,170,0.30)"
                      strokeDasharray="4 4"
                      label={{ value: 'MSL', fill: '#00d4aa', fontSize: 9 }}
                    />

                    {/* HW dots */}
                    {hwlwDots.filter(e => e.type === 'HW').map((ev, i) => (
                      <ReferenceDot
                        key={`hw-${i}`}
                        x={ev.chartX}
                        y={ev.height}
                        r={5}
                        fill="#f59e0b"
                        stroke="var(--bg-surface)"
                        strokeWidth={1.5}
                        label={{ value: `${ev.height.toFixed(1)}m`, position: 'top', fontSize: 9, fill: '#f59e0b' }}
                      />
                    ))}

                    {/* LW dots */}
                    {hwlwDots.filter(e => e.type === 'LW').map((ev, i) => (
                      <ReferenceDot
                        key={`lw-${i}`}
                        x={ev.chartX}
                        y={ev.height}
                        r={5}
                        fill="#38bdf8"
                        stroke="var(--bg-surface)"
                        strokeWidth={1.5}
                        label={{ value: `${ev.height.toFixed(1)}m`, position: 'bottom', fontSize: 9, fill: '#38bdf8' }}
                      />
                    ))}

                    {/* Now reference line (today only) */}
                    {isToday && nowLabel && (
                      <ReferenceLine
                        x={nowLabel}
                        stroke="rgba(255,255,255,0.35)"
                        strokeDasharray="3 3"
                        label={{ value: 'NOW', fill: 'rgba(255,255,255,0.55)', fontSize: 8, position: 'top' }}
                      />
                    )}

                    <Area
                      type="monotone"
                      dataKey="h"
                      stroke="#0A9696"
                      strokeWidth={2}
                      fill="url(#tideGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#0DC8C8', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs font-mono"
                  style={{ color: 'var(--text-muted)' }}>
                  Computing tidesâ€¦
                </div>
              )}
            </div>

            {/* â”€â”€ Right panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex flex-col gap-4">

              {/* Live current height (today only) */}
              {isToday && currentHeight !== null && (
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} />
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                      CURRENT HEIGHT Â· IST {toIST(now, timeFormat)}
                    </span>
                  </div>
                  <div className="font-mono font-bold" style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>
                    {currentHeight.toFixed(2)}
                    <span className="text-base ml-1" style={{ color: 'var(--text-secondary)' }}>m</span>
                  </div>
                  {fillPct !== null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>0 m</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{fillPct}% of MHWS</span>
                        <span>{port.mhws} m</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--border)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${fillPct}%`,
                            background: `linear-gradient(90deg, #0A9696, ${fillPct > 70 ? '#f59e0b' : '#0DC8C8'})`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Next HW/LW */}
              {nextEvent && mounted && (
                <div className="glass-card p-5"
                  style={{ borderTop: `3px solid ${nextEvent.type === 'HW' ? 'var(--accent-hw)' : 'var(--accent-lw)'}` }}>
                  <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                    {isToday ? 'NEXT' : 'FIRST EVENT'}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {nextEvent.type === 'HW'
                      ? <TrendingUp  className="w-5 h-5" style={{ color: 'var(--accent-hw)' }} />
                      : <TrendingDown className="w-5 h-5" style={{ color: 'var(--accent-lw)' }} />}
                    <span className="font-display font-bold text-xl"
                      style={{ color: nextEvent.type === 'HW' ? 'var(--accent-hw)' : 'var(--accent-lw)' }}>
                      {nextEvent.type === 'HW' ? 'High Water' : 'Low Water'}
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {toIST(nextEvent.time, timeFormat)}
                  </div>
                  <div className="font-mono text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {nextEvent.height.toFixed(2)} m
                  </div>
                  {countdown && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-mono"
                      style={{ color: nextEvent.type === 'HW' ? 'var(--accent-hw)' : 'var(--accent-lw)' }}>
                      <Clock className="w-3 h-3" />
                      in {countdown}
                    </div>
                  )}
                </div>
              )}

              {/* Today's tide table */}
              <div className="glass-card p-5 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {isToday ? "TODAY'S" : ''} TIDES (IST)
                  </span>
                </div>
                {mounted && hwlw.length > 0 ? (
                  <div className="space-y-3">
                    {hwlw.map((ev, i) => {
                      const isPast = isToday && ev.time < now
                      return (
                        <div key={i} className="flex items-center justify-between"
                          style={{ opacity: isPast ? 0.45 : 1 }}>
                          <div className="flex items-center gap-2">
                            <span className={ev.type === 'HW' ? 'hw-badge' : 'lw-badge'}>
                              {ev.type}
                            </span>
                            <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                              {toIST(ev.time, timeFormat)}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-semibold"
                            style={{ color: ev.type === 'HW' ? 'var(--accent-hw)' : 'var(--accent-lw)' }}>
                            {ev.height.toFixed(2)} m
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {mounted ? 'No events found' : 'Computingâ€¦'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* â”€â”€ Port grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="mt-8">
            <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              All Ports
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {PORTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPortId(p.id)}
                  className="glass-card p-4 text-left transition-all"
                  style={portId === p.id ? { borderColor: 'var(--accent-blue)', background: 'rgba(10,150,150,0.10)' } : {}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      â†• {p.springRange} m
                    </span>
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {p.state}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="hw-badge">HW {p.mhws}m</span>
                    <span className="lw-badge">LW {p.mlws}m</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TidePilot AI floating chat */}
      <TideChat />

      {/* Footer */}
      <footer className="py-8 mt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="container-tp text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          <p>TidePilot &middot; Harmonic tide predictions for Indian ports</p>
          <p className="mt-1">
            Built by{' '}
            <a href="https://sujikumar.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent-cyan)' }}>
              Suji Kumar C
            </a>
            {' '}&middot; Data: ATT Vol. 4 &middot; NHO India &middot; TPXO9
          </p>
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            For navigation purposes, always verify against official NHO India Tide Tables.
          </p>
        </div>
      </footer>
    </div>
  )
}

