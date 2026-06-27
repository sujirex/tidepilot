/**
 * aiQuery.ts
 * ----------
 * TidePilot AI — Natural Language Query Parser & Response Builder
 *
 * Converts plain English questions into real tide data answers.
 * Zero cost · Zero API calls · 100% browser-based · Works offline · Works on Android
 *
 * Pipeline:
 *   1. Normalise  → lowercase, strip punctuation
 *   2. Port       → fuzzy match against known Indian ports + aliases
 *   3. Date       → "today", "tomorrow", day names, "15 June", etc. (IST)
 *   4. Time       → "morning", "6am", "14:00" etc. → IST hour 0–23
 *   5. Intent     → "high tide", "safe", "spring", "schedule", etc.
 *   6. Respond    → run tideEngine and format a natural language answer
 */

import { PORTS, DEFAULT_PORT_ID, type Port } from './ports'
import {
  dailyTidePoints,
  dailyHWLW,
  tideHeight,
  tidalPhase,
  toIST,
  toISTDate,
  type HWLWEvent,
} from './tideEngine'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Intent =
  | 'high_tide'    // user wants HW info
  | 'low_tide'     // user wants LW info
  | 'current'      // tide right now / at a specific time
  | 'schedule'     // full day HW/LW schedule
  | 'safe'         // is it safe to navigate / enter port?
  | 'phase'        // spring or neap?
  | 'range'        // tidal range for the day
  | 'out_of_scope' // weather, flood warnings, storms — not tide data
  | 'need_port'    // user asked a tide question but no port mentioned
  | 'unknown'      // fallback — show full schedule

export interface ParsedQuery {
  port:   Port
  date:   Date        // UTC midnight of the target IST date
  hour:   number | null  // 0–23 IST hour; null = not specified
  intent: Intent
  raw:    string
}

export interface AIResponse {
  answer: string      // multiline text (use \n for line breaks)
  port:   Port
  date:   Date
}

// ── Port aliases ──────────────────────────────────────────────────────────────
// Maps common alternate names / misspellings to port IDs

const PORT_ALIASES: Record<string, string> = {
  // Gujarat
  bharuch:       'dahej',
  khambhat:      'dahej',
  cambay:        'dahej',
  bhavnagar:     'bhavnagar',
  bhavanagar:    'bhavnagar',
  surat:         'hazira',
  hazira:        'hazira',
  deendayal:     'kandla',
  gandhidham:    'kandla',
  kandla:        'kandla',
  mundra:        'kandla',    // closest available port
  // West coast
  bombay:        'mumbai',
  jnpt:          'mumbai',
  nhava:         'mumbai',
  'nhava sheva': 'mumbai',
  goa:           'mormugao',
  vasco:         'mormugao',
  mormugao:      'mormugao',
  cochin:        'kochi',
  kochi:         'kochi',
  ernakulam:     'kochi',
  mangalore:     'kochi',    // closest available
  // East coast
  madras:        'chennai',
  chennai:       'chennai',
  ennore:        'chennai',
  visakhapatnam: 'vizag',
  vizag:         'vizag',
  waltair:       'vizag',
  paradip:       'paradip',
  paradeep:      'paradip',
  haldia:        'kolkata',
  hooghly:       'kolkata',
  calcutta:      'kolkata',
  kolkata:       'kolkata',
  // Islands
  andaman:       'portblair',
  'port blair':  'portblair',
}

// ── IST date helpers ──────────────────────────────────────────────────────────

/** UTC midnight that maps to "today" in IST */
function todayUTCMidnight(): Date {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()))
}

/** Current IST hour (0–23) */
function currentISTHour(): number {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  return ist.getUTCHours()
}

/** Returns UTC midnight N days from today (IST) */
function daysFromToday(n: number): Date {
  const t = todayUTCMidnight()
  return new Date(t.getTime() + n * 86_400_000)
}

/** Parse a day name ("monday", "tuesday"…) to next occurrence UTC midnight */
function nextWeekday(name: string): Date | null {
  const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const idx = DAY_NAMES.indexOf(name)
  if (idx < 0) return null
  const todayDay = new Date(todayUTCMidnight().getTime() + 5.5 * 3_600_000).getUTCDay()
  let diff = idx - todayDay
  if (diff <= 0) diff += 7
  return daysFromToday(diff)
}

/** Parse "15 june" / "june 15" / "15/06" patterns → UTC midnight */
function parseDateLiteral(q: string): Date | null {
  const MONTHS: Record<string, number> = {
    jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
    jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
    january:0, february:1, march:2, april:3, june:5,
    july:6, august:7, september:8, october:9, november:10, december:11,
  }

  // "15 june" or "june 15"
  const m1 = q.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec\w*)\b/i)
  const m2 = q.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec\w*)\s+(\d{1,2})\b/i)
  if (m1 || m2) {
    const day   = m1 ? parseInt(m1[1]) : parseInt(m2![2])
    const month = m1 ? MONTHS[m1[2].slice(0,3).toLowerCase()] : MONTHS[m2![1].slice(0,3).toLowerCase()]
    if (month === undefined) return null
    const year  = new Date().getFullYear()
    return new Date(Date.UTC(year, month, day))
  }

  // "15/06" or "06/15"
  const m3 = q.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (m3) {
    const year = new Date().getFullYear()
    return new Date(Date.UTC(year, parseInt(m3[2]) - 1, parseInt(m3[1])))
  }

  return null
}

// ── Port extraction ───────────────────────────────────────────────────────────

function extractPort(q: string): Port {
  const norm = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')

  // Check aliases (longest match first to avoid partial hits)
  const aliasKeys = Object.keys(PORT_ALIASES).sort((a, b) => b.length - a.length)
  for (const alias of aliasKeys) {
    if (norm.includes(alias)) {
      const id = PORT_ALIASES[alias]
      const port = PORTS.find(p => p.id === id)
      if (port) return port
    }
  }

  // Check port names directly
  for (const port of PORTS) {
    if (norm.includes(port.name.toLowerCase())) return port
  }

  // Default to Dahej if nothing found
  return PORTS.find(p => p.id === DEFAULT_PORT_ID)!
}

// ── Date extraction ───────────────────────────────────────────────────────────

function extractDate(q: string): Date {
  const n = q.toLowerCase()

  if (n.includes('yesterday'))        return daysFromToday(-1)
  if (n.includes('today') ||
      n.includes('now') ||
      n.includes('current'))          return todayUTCMidnight()
  if (n.includes('tomorrow'))         return daysFromToday(1)
  if (n.includes('day after'))        return daysFromToday(2)
  if (n.includes('next week'))        return daysFromToday(7)

  // Day names
  const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  for (const d of DAY_NAMES) {
    if (n.includes(d)) {
      const result = nextWeekday(d)
      if (result) return result
    }
  }

  // Literal date patterns
  const literal = parseDateLiteral(n)
  if (literal) return literal

  return todayUTCMidnight()
}

// ── Time extraction ───────────────────────────────────────────────────────────

function extractHour(q: string): number | null {
  const n = q.toLowerCase()

  // Named periods
  if (n.match(/\b(early morning|dawn|sunrise)\b/))   return 6
  if (n.match(/\b(morning)\b/))                       return 8
  if (n.match(/\b(noon|midday)\b/))                   return 12
  if (n.match(/\b(afternoon)\b/))                     return 14
  if (n.match(/\b(evening|sunset)\b/))                return 18
  if (n.match(/\b(night|tonight)\b/))                 return 21
  if (n.match(/\b(midnight)\b/))                      return 0

  // "6am", "6 am", "6:30am"
  const ampm = n.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/)
  if (ampm) {
    let h = parseInt(ampm[1])
    if (ampm[3] === 'pm' && h < 12) h += 12
    if (ampm[3] === 'am' && h === 12) h = 0
    return h
  }

  // "14:30" or "1430"
  const hhmm = n.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (hhmm) return parseInt(hhmm[1])

  return null
}

// ── Intent extraction ─────────────────────────────────────────────────────────

/** Keywords that are completely outside TidePilot's scope */
const OUT_OF_SCOPE_PATTERNS = [
  /\b(flood warning|flood alert|flood risk|flooding)\b/,
  /\b(storm warning|storm surge|cyclone|hurricane|typhoon)\b/,
  /\b(weather|rainfall|rain|wind speed|wave height|swell|tsunami)\b/,
  /\b(port activities|ship traffic|vessel traffic|cargo|berthing availability)\b/,
  /\b(accident|incident|collision|stranding|grounding)\b/,
  /\b(forecast|prediction|climate|temperature|humidity)\b/,
  /\b(news|alert|warning|advisory)\b/,
]

function extractIntent(q: string): Intent {
  const n = q.toLowerCase()

  // Out-of-scope check first
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(n)) return 'out_of_scope'
  }

  if (n.match(/\b(high water|high tide|hw|high\s*water)\b/))             return 'high_tide'
  if (n.match(/\b(low water|low tide|lw|low\s*water)\b/))                return 'low_tide'
  if (n.match(/\b(safe|enter|berth|navigate|vessel|draft|clearance)\b/)) return 'safe'
  if (n.match(/\b(spring|neap|phase|lunar|moon)\b/))                     return 'phase'
  if (n.match(/\b(range|difference|rise|fall|between)\b/))               return 'range'
  if (n.match(/\b(schedule|all|full day|times|list|today\'?s?)\b/))      return 'schedule'
  if (n.match(/\b(now|current|right now|at the moment)\b/))              return 'current'
  if (n.match(/\b(height|level|depth|meter|metre|reading)\b/))           return 'current'

  return 'schedule'  // default: show full day schedule
}

// ── Response builders ─────────────────────────────────────────────────────────

function phaseEmoji(phase: string): string {
  if (phase === 'Spring')      return '🌕 Spring tide'
  if (phase === 'Near Spring') return '🌔 Near Spring'
  if (phase === 'Neap')        return '🌑 Neap tide'
  if (phase === 'Near Neap')   return '🌒 Near Neap'
  return '🌓 Intermediate'
}

function directionArrow(points: {height:number}[], idx: number): string {
  if (idx <= 0 || idx >= points.length - 1) return ''
  return points[idx + 1].height > points[idx - 1].height ? '↑' : '↓'
}

/** "in 2h 15min" or "45 min ago" relative to now */
function timeUntil(target: Date): string {
  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) {
    const m = Math.round(-diffMs / 60_000)
    return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ago`
  }
  const mins = Math.round(diffMs / 60_000)
  if (mins < 60) return `in ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `in ${h}h ${m}min` : `in ${h}h`
}

/** Rate of tide change from 10-min sampled points */
function tideRateText(points: { time: Date; height: number }[], idx: number): string {
  if (idx < 2 || idx >= points.length - 2) return ''
  const delta = points[idx + 2].height - points[idx - 2].height
  const ratePerHr = Math.abs(delta) * 1.5
  if (ratePerHr < 0.04) return 'Slack water'
  const dir = delta > 0 ? 'Rising' : 'Falling'
  if (ratePerHr > 1.0) return `${dir} fast (~${ratePerHr.toFixed(1)} m/hr)`
  return `${dir} (~${ratePerHr.toFixed(1)} m/hr)`
}

/** Warning for ports with large tidal ranges */
function rangeWarning(port: Port): string {
  if (port.springRange >= 6) {
    return `!! Extreme range at ${port.name} (~${port.springRange.toFixed(0)} m spring). Monitor mooring tension and keel clearance continuously.`
  }
  if (port.springRange >= 3.5) {
    return `Large spring range (~${port.springRange.toFixed(0)} m). Check mooring lines and keel clearance at LW.`
  }
  return ''
}

/** Plain-English spring/neap explanation for mariners and non-experts */
function phaseExplain(phase: string, port: Port): string {
  const sr = port.springRange.toFixed(1)
  const nr = (port.springRange * 0.55).toFixed(1)
  if (phase === 'Spring' || phase === 'Near Spring') {
    return `Spring tides (near new/full moon) — range at maximum (~${sr} m). HW is highest, LW is lowest. Best tidal window for deep-draft entry.`
  }
  if (phase === 'Neap' || phase === 'Near Neap') {
    return `Neap tides (quarter moon) — smaller range (~${nr} m). HW lower, LW higher than springs. Easier mooring, less tidal assistance.`
  }
  return `Intermediate phase — range between spring (~${sr} m) and neap (~${nr} m).`
}

function buildScheduleResponse(port: Port, date: Date): string {
  const events = dailyHWLW(date, port.constituents)
  const phase  = tidalPhase(date)
  const range  = port.mhws - port.mlws

  let lines = [
    `📍 ${port.name} — ${toISTDate(date)}`,
    `🌊 ${phaseEmoji(phase)} · Range ~${range.toFixed(1)} m`,
    '',
  ]

  if (events.length === 0) {
    lines.push('No high/low water events found for this day.')
  } else {
    for (const e of events) {
      const icon = e.type === 'HW' ? '🔼 HW' : '🔽 LW'
      lines.push(`${icon}  ${toIST(e.time)} (${timeUntil(e.time)})  —  ${e.height.toFixed(2)} m`)
    }
  }

  const warn = rangeWarning(port)
  if (warn) { lines.push(''); lines.push(warn) }
  lines.push('')
  lines.push('Verify with NHO Tide Tables before critical operations.')

  return lines.join('\n')
}

function buildHighTideResponse(port: Port, date: Date, hour: number | null): string {
  const events = dailyHWLW(date, port.constituents)
  const hws    = events.filter(e => e.type === 'HW')
  const phase  = tidalPhase(date)

  if (hws.length === 0) {
    return `No high tide data found for ${port.name} on ${toISTDate(date)}.`
  }

  let targetHW = hws[0]
  if (hour !== null) {
    // Find HW closest to requested hour
    targetHW = hws.reduce((best, e) => {
      const eHour  = new Date(e.time.getTime() + 5.5 * 3_600_000).getUTCHours()
      const bHour  = new Date(best.time.getTime() + 5.5 * 3_600_000).getUTCHours()
      return Math.abs(eHour - hour) < Math.abs(bHour - hour) ? e : best
    })
  }

  const lines = [
    `📍 High tide at ${port.name} — ${toISTDate(date)}`,
    `🔼 HW  ${toIST(targetHW.time)} (${timeUntil(targetHW.time)})  —  ${targetHW.height.toFixed(2)} m`,
    '',
  ]

  // Show other HW events for context
  const others = hws.filter(e => e !== targetHW)
  if (others.length > 0) {
    lines.push(`Other HW: ${others.map(e => `${toIST(e.time)} (${e.height.toFixed(1)} m, ${timeUntil(e.time)})`).join(', ')}`)
    lines.push('')
  }

  lines.push(phaseEmoji(phase))
  return lines.join('\n')
}

function buildLowTideResponse(port: Port, date: Date, hour: number | null): string {
  const events = dailyHWLW(date, port.constituents)
  const lws    = events.filter(e => e.type === 'LW')
  const phase  = tidalPhase(date)

  if (lws.length === 0) {
    return `No low tide data found for ${port.name} on ${toISTDate(date)}.`
  }

  let targetLW = lws[0]
  if (hour !== null) {
    targetLW = lws.reduce((best, e) => {
      const eHour = new Date(e.time.getTime() + 5.5 * 3_600_000).getUTCHours()
      const bHour = new Date(best.time.getTime() + 5.5 * 3_600_000).getUTCHours()
      return Math.abs(eHour - hour) < Math.abs(bHour - hour) ? e : best
    })
  }

  const lines = [
    `📍 Low tide at ${port.name} — ${toISTDate(date)}`,
    `🔽 LW  ${toIST(targetLW.time)} (${timeUntil(targetLW.time)})  —  ${targetLW.height.toFixed(2)} m`,
    '',
  ]

  const others = lws.filter(e => e !== targetLW)
  if (others.length > 0) {
    lines.push(`Other LW: ${others.map(e => `${toIST(e.time)} (${e.height.toFixed(1)} m, ${timeUntil(e.time)})`).join(', ')}`)
    lines.push('')
  }

  lines.push(phaseEmoji(phase))
  return lines.join('\n')
}

function buildCurrentResponse(port: Port, date: Date, hour: number | null): string {
  const istHour = hour ?? currentISTHour()
  const targetTime = new Date(date.getTime() + istHour * 3_600_000 - 5.5 * 3_600_000)
    // Convert IST hour to UTC for tide calculation

  // Use UTC midnight of the date as reference for same-day calculation
  const refDate = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()
  ))

  const height = tideHeight(targetTime, port.constituents, refDate)
  const points = dailyTidePoints(date, port.constituents, 10)

  // Find approximate direction
  const targetMs = targetTime.getTime()
  let closestIdx = 0
  let minDiff = Infinity
  for (let i = 0; i < points.length; i++) {
    const diff = Math.abs(points[i].time.getTime() - targetMs)
    if (diff < minDiff) { minDiff = diff; closestIdx = i }
  }
  const arrow = directionArrow(points, closestIdx)

  const events = dailyHWLW(date, port.constituents)
  const phase  = tidalPhase(date)

  // Find next HW and LW after the target time
  const nextHW = events.find(e => e.type === 'HW' && e.time.getTime() > targetTime.getTime())
  const nextLW = events.find(e => e.type === 'LW' && e.time.getTime() > targetTime.getTime())

  const rate      = tideRateText(points, closestIdx)
  const pct       = Math.round((height / port.mhws) * 100)
  const timeLabel = hour !== null
    ? `${String(istHour).padStart(2,'0')}:00 IST`
    : 'Now'

  const lines = [
    `📍 ${port.name} — ${toISTDate(date)} at ${timeLabel}`,
    `🌊 Tide: ${height.toFixed(2)} m (${pct}% of MHWS)  ${rate}`,
    '',
  ]

  if (nextHW) lines.push(`🔼 Next HW: ${toIST(nextHW.time)} (${timeUntil(nextHW.time)}) — ${nextHW.height.toFixed(2)} m`)
  if (nextLW) lines.push(`🔽 Next LW: ${toIST(nextLW.time)} (${timeUntil(nextLW.time)}) — ${nextLW.height.toFixed(2)} m`)
  lines.push('')
  lines.push(phaseEmoji(phase))

  return lines.join('\n')
}

function buildSafeResponse(port: Port, date: Date, hour: number | null): string {
  const istHour = hour ?? currentISTHour()
  const targetTime = new Date(date.getTime() + istHour * 3_600_000 - 5.5 * 3_600_000)
  const refDate = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()
  ))

  const height = tideHeight(targetTime, port.constituents, refDate)
  const events = dailyHWLW(date, port.constituents)
  const phase  = tidalPhase(date)

  const nextHW = events.find(e => e.type === 'HW' && e.time.getTime() > targetTime.getTime())
  const nextLW = events.find(e => e.type === 'LW' && e.time.getTime() > targetTime.getTime())
  // Safety assessment based on proportion of MHWS
  const pct = height / port.mhws
  let advice = ''
  let draftNote = ''
  if (pct >= 0.75) {
    advice = '✅ Favourable — good water depth available.'
    draftNote = `Height ${height.toFixed(2)} m is ${Math.round(pct * 100)}% of MHWS (${port.mhws.toFixed(1)} m). Most vessel classes can operate.`
  } else if (pct >= 0.45) {
    advice = '⚠️  Moderate — check vessel draft carefully.'
    draftNote = `Height ${height.toFixed(2)} m is ${Math.round(pct * 100)}% of MHWS. Verify keel clearance before entry.`
  } else {
    advice = '🚫 Low water — restricted depth. Wait for next HW if possible.'
    draftNote = `Height only ${height.toFixed(2)} m (${Math.round(pct * 100)}% of MHWS). Deep-draft vessels should delay.`
  }

  const timeLabel = `${String(istHour).padStart(2,'0')}:00 IST`

  const lines = [
    `📍 ${port.name} — ${toISTDate(date)} at ${timeLabel}`,
    `🌊 Tide: ${height.toFixed(2)} m  |  MHWS: ${port.mhws.toFixed(1)} m  |  MLWS: ${port.mlws.toFixed(1)} m`,
    '',
    advice,
    draftNote,
    '',
  ]

  if (nextHW) lines.push(`🔼 Next HW: ${toIST(nextHW.time)} (${timeUntil(nextHW.time)}) — ${nextHW.height.toFixed(2)} m`)
  if (nextLW) lines.push(`🔽 Next LW: ${toIST(nextLW.time)} (${timeUntil(nextLW.time)}) — ${nextLW.height.toFixed(2)} m`)

  const warn = rangeWarning(port)
  if (warn) { lines.push(''); lines.push(warn) }

  lines.push('')
  lines.push(phaseEmoji(phase))
  lines.push('')
  lines.push('Always verify with official NHO Tide Tables before navigation.')

  return lines.join('\n')
}

function buildPhaseResponse(port: Port, date: Date): string {
  const phase = tidalPhase(date)
  const range = port.springRange

  const lines = [
    `📍 ${port.name} — ${toISTDate(date)}`,
    `🌊 Tidal phase: ${phaseEmoji(phase)}`,
    '',
    `Spring range: ~${range.toFixed(1)} m`,
    `MHWS: ${port.mhws.toFixed(1)} m  ·  MLWS: ${port.mlws.toFixed(1)} m`,
    '',
  ]

  const events = dailyHWLW(date, port.constituents)
  const hws = events.filter(e => e.type === 'HW')
  const lws = events.filter(e => e.type === 'LW')
  if (hws.length > 0 && lws.length > 0) {
    const maxHW = Math.max(...hws.map(e => e.height))
    const minLW = Math.min(...lws.map(e => e.height))
    lines.push(`Today's range: ${(maxHW - minLW).toFixed(2)} m`)
  }

  lines.push('')
  lines.push(phaseExplain(phase, port))

  return lines.join('\n')
}

function buildRangeResponse(port: Port, date: Date): string {
  const events = dailyHWLW(date, port.constituents)
  const hws = events.filter(e => e.type === 'HW')
  const lws = events.filter(e => e.type === 'LW')
  const phase = tidalPhase(date)

  const lines = [
    `📍 ${port.name} — ${toISTDate(date)}`,
    `🌊 ${phaseEmoji(phase)}`,
    '',
  ]

  if (hws.length > 0 && lws.length > 0) {
    const maxHW = Math.max(...hws.map(e => e.height))
    const minLW = Math.min(...lws.map(e => e.height))
    const dayRange = maxHW - minLW
    lines.push(`Today's range: ${dayRange.toFixed(2)} m`)
    lines.push(`  Highest HW: ${maxHW.toFixed(2)} m`)
    lines.push(`  Lowest LW:  ${minLW.toFixed(2)} m`)
    lines.push('')
    lines.push(`Spring (max): ~${port.springRange.toFixed(1)} m  |  MHWS: ${port.mhws.toFixed(1)} m  |  MLWS: ${port.mlws.toFixed(1)} m`)
    const warn = rangeWarning(port)
    if (warn) { lines.push(''); lines.push(warn) }
  } else {
    lines.push('Could not calculate range for this date.')
  }

  return lines.join('\n')
}

// ── Fallback for unrecognised queries ─────────────────────────────────────────

function buildOutOfScopeResponse(raw: string): string {
  return [
    "I can only answer questions about tidal data for Indian ports.",
    '',
    '⚠️ For flood warnings, storm alerts, weather, and port operations, please check:',
    '• INCOIS Ocean Services — incois.gov.in',
    '• IMD Weather Warnings — mausam.imd.gov.in',
    '• Indian Coast Guard — indiancoastguard.gov.in',
    '',
    'What I CAN help you with:',
    '• "High tide at Kandla tomorrow morning?"',
    '• "Is it safe to enter Hazira at 6am?"',
    '• "Spring or neap at Mumbai today?"',
    '• "Tide schedule for Dahej this week"',
  ].join('\n')
}

function buildNeedPortResponse(): string {
  const portList = PORTS.map(p => p.name).join(', ')
  return [
    "Which port are you asking about?",
    '',
    'I cover 12 major Indian ports:',
    portList,
    '',
    'Try: "High tide at [port name] today"',
  ].join('\n')
}

function buildUnknownResponse(): string {
  return [
    "I didn't quite understand that. Try asking:",
    '',
    '• "High tide at Kandla tomorrow?"',
    '• "Tide schedule for Mumbai today"',
    '• "Is it safe to enter Dahej at 6am Friday?"',
    '• "Spring or neap at Hazira this week?"',
    '• "Low tide time at Kochi morning"',
  ].join('\n')
}


// ── Main export ───────────────────────────────────────────────────────────────

/** Returns true if the user explicitly named a port in their query */
function portMentioned(q: string): boolean {
  const norm = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const aliasKeys = Object.keys(PORT_ALIASES)
  if (aliasKeys.some(a => norm.includes(a))) return true
  if (PORTS.some(p => norm.includes(p.name.toLowerCase()))) return true
  return false
}

export function answerQuery(raw: string): AIResponse {
  const defaultPort = PORTS.find(p => p.id === DEFAULT_PORT_ID)!
  const today       = todayUTCMidnight()

  if (!raw.trim()) {
    return { answer: buildUnknownResponse(), port: defaultPort, date: today }
  }

  const q      = raw.toLowerCase()
  const intent = extractIntent(q)

  if (intent === 'out_of_scope') {
    return { answer: buildOutOfScopeResponse(raw), port: defaultPort, date: today }
  }

  const hasTideKeyword = /\b(tide|tidal|hw|lw|high water|low water|water level|height|safe|spring|neap|range|schedule|berth|navigate|enter)\b/.test(q)
  if (!portMentioned(q) && hasTideKeyword) {
    return { answer: buildNeedPortResponse(), port: defaultPort, date: today }
  }

  if (!portMentioned(q) && !hasTideKeyword) {
    return { answer: buildUnknownResponse(), port: defaultPort, date: today }
  }

  const port = extractPort(q)
  const date = extractDate(q)
  const hour = extractHour(q)

  let answer: string
  switch (intent) {
    case 'high_tide': answer = buildHighTideResponse(port, date, hour);  break
    case 'low_tide':  answer = buildLowTideResponse(port, date, hour);   break
    case 'current':   answer = buildCurrentResponse(port, date, hour);   break
    case 'safe':      answer = buildSafeResponse(port, date, hour);      break
    case 'phase':     answer = buildPhaseResponse(port, date);           break
    case 'range':     answer = buildRangeResponse(port, date);           break
    case 'schedule':  answer = buildScheduleResponse(port, date);        break
    default:          answer = buildScheduleResponse(port, date);        break
  }

  return { answer, port, date }
}

export const SUGGESTED_QUERIES = [
  'Tide schedule at Dahej today',
  'High tide at Kandla tomorrow morning',
  'Is it safe to enter Hazira at 6am?',
  'Spring or neap at Mumbai today?',
  'Low tide time at Kochi this evening',
  'Tidal range at Chennai tomorrow',
]
