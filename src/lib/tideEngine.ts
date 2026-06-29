/**
 * TidePilot — Harmonic Tide Prediction Engine
 *
 * Standard harmonic method using 8 principal tidal constituents.
 * Reference epoch: 1 January 2000 00:00 UTC (J2000)
 *
 * Formula: h(t) = Z0 + Σ f_n × H_n × cos(σ_n × t + V0_n + u_n − g_n)
 *
 * Where:
 *   Z0   = mean sea level above chart datum
 *   f_n  = nodal amplitude factor
 *   H_n  = tidal amplitude from harmonic constants
 *   σ_n  = angular speed (°/hr)
 *   t    = hours since reference date
 *   V0_n = equilibrium argument at reference date
 *   u_n  = nodal phase correction
 *   g_n  = local phase lag (published in tide tables)
 */

export const CONSTITUENT_NAMES = ['M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1', 'M4', 'MS4', 'SA'] as const
export type ConstituentName = (typeof CONSTITUENT_NAMES)[number]

/** Angular speed of each constituent in degrees per hour */
const SPEEDS: Record<ConstituentName, number> = {
  M2: 28.984104,
  S2: 30.000000,
  N2: 28.439730,
  K2: 30.082137,
  K1: 15.041069,
  O1: 13.943036,
  P1: 14.958931,
  Q1:  13.398661,
  M4:  57.968208,   // 2 x M2: shallow-water overtide
  MS4: 58.984104,   // M2 + S2: compound
  SA:   0.041067,   // solar annual: seasonal MSL
}

/** Days since J2000 (1 Jan 2000 00:00 UTC) */
function daysSinceJ2000(date: Date): number {
  const J2000 = Date.UTC(2000, 0, 1, 0, 0, 0)
  return (date.getTime() - J2000) / 86_400_000
}

/** Lunar/solar orbital elements at d days since J2000 (degrees) */
function lunarElements(d: number) {
  const wrap = (x: number) => ((x % 360) + 360) % 360
  return {
    s:  wrap(218.3164 + 13.17639646 * d),  // Moon mean longitude
    h:  wrap(280.4665 +  0.98564736 * d),  // Sun mean longitude
    p:  wrap( 83.3532 +  0.11140353 * d),  // Moon perigee longitude
    N:  wrap(125.0445 -  0.05295377 * d),  // Ascending node longitude
  }
}

/** Equilibrium arguments V0 at the reference date (degrees) */
function equilibriumArgs(d: number): Record<ConstituentName, number> {
  const { s, h, p, N } = lunarElements(d)
  const w = (x: number) => ((x % 360) + 360) % 360
  return {
    M2:  w(2 * h - 2 * s),
    S2:  0,
    N2:  w(2 * h - 3 * s + p),
    K2:  w(2 * h),
    K1:  w(h + 90),
    O1:  w(h - 2 * s - 90),
    P1:  w(-h + 270),
    Q1:  w(h - 3 * s + p - 90),
    M4:  w(4 * h - 4 * s),        // 2 x V0(M2)
    MS4: w(2 * h - 2 * s),        // V0(M2) + V0(S2)
    SA:  w(h),                     // sun's mean longitude
  }
}

/** Nodal amplitude factors f */
function nodalF(N: number): Record<ConstituentName, number> {
  const Nr = (N * Math.PI) / 180
  return {
    M2: 1.000 - 0.037 * Math.cos(Nr),
    S2: 1.000,
    N2: 1.000 - 0.037 * Math.cos(Nr),
    K2: 1.024 + 0.286 * Math.cos(Nr),
    K1: 1.006 + 0.115 * Math.cos(Nr) - 0.009 * Math.cos(2 * Nr),
    O1: 1.009 + 0.187 * Math.cos(Nr) - 0.015 * Math.cos(2 * Nr),
    P1: 1.000,
    Q1:  1.009 + 0.187 * Math.cos(Nr) - 0.015 * Math.cos(2 * Nr),
    M4:  (1.000 - 0.037 * Math.cos(Nr)) * (1.000 - 0.037 * Math.cos(Nr)),
    MS4: 1.000 - 0.037 * Math.cos(Nr),
    SA:  1.000,
  }
}

/** Nodal phase corrections u (degrees) */
function nodalU(N: number): Record<ConstituentName, number> {
  const Nr = (N * Math.PI) / 180
  return {
    M2:  -2.1 * Math.sin(Nr),
    S2:  0,
    N2:  -2.1 * Math.sin(Nr),
    K2:  -17.7 * Math.sin(Nr),
    K1:  -8.9 * Math.sin(Nr) + 0.7 * Math.sin(2 * Nr),
    O1:  10.8 * Math.sin(Nr) - 1.3 * Math.sin(2 * Nr),
    P1:  0,
    Q1:  10.8 * Math.sin(Nr) - 1.3 * Math.sin(2 * Nr),
    M4:  -4.2 * Math.sin(Nr),
    MS4: -2.1 * Math.sin(Nr),
    SA:  0,
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ConstituentData {
  H: number  // amplitude (metres)
  g: number  // phase lag (degrees, local)
}

export interface PortConstituents {
  Z0: number   // mean sea level above chart datum (metres)
  M2: ConstituentData
  S2: ConstituentData
  N2: ConstituentData
  K2: ConstituentData
  K1: ConstituentData
  O1: ConstituentData
  P1: ConstituentData
  Q1:  ConstituentData
  M4:  ConstituentData   // shallow-water overtide
  MS4: ConstituentData   // compound M2+S2
  SA:  ConstituentData   // solar annual (seasonal MSL)
}

export interface TidePoint {
  time: Date
  height: number  // metres above chart datum
}

export interface HWLWEvent {
  time: Date
  height: number
  type: 'HW' | 'LW'
}

// ─── Core prediction ──────────────────────────────────────────────────────────

/**
 * Compute tide height at a UTC date/time for a port.
 * @param date       UTC moment to evaluate
 * @param consts     Port harmonic constants
 * @param refDate    UTC reference date (start of day). Defaults to start of date's UTC day.
 */
export function tideHeight(
  date: Date,
  consts: PortConstituents,
  refDate?: Date,
): number {
  const ref = refDate
    ?? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const d0 = daysSinceJ2000(ref)
  const t  = (date.getTime() - ref.getTime()) / 3_600_000  // hours

  const { N } = lunarElements(d0)
  const V0 = equilibriumArgs(d0)
  const f  = nodalF(N)
  const u  = nodalU(N)

  let h = consts.Z0
  for (const name of CONSTITUENT_NAMES) {
    const { H, g } = consts[name]
    const angle = (SPEEDS[name] * t + V0[name] + u[name] - g) * (Math.PI / 180)
    h += f[name] * H * Math.cos(angle)
  }
  return Math.max(0, Math.round(h * 100) / 100)
}

// ─── High-level helpers ────────────────────────────────────────────────────────

/**
 * Generate tide height samples for a full UTC day.
 * @param date           UTC date (any time — day is extracted)
 * @param consts         Port harmonic constants
 * @param intervalMins   Sample interval in minutes (default 10)
 */
export function dailyTidePoints(
  date: Date,
  consts: PortConstituents,
  intervalMins = 10,
): TidePoint[] {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const steps  = Math.round((24 * 60) / intervalMins)
  const points: TidePoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = new Date(start.getTime() + i * intervalMins * 60_000)
    points.push({ time: t, height: tideHeight(t, consts, start) })
  }
  return points
}

/** Find local HW/LW extrema in a sorted TidePoint array */
export function findHWLW(points: TidePoint[]): HWLWEvent[] {
  const events: HWLWEvent[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].height
    const curr = points[i].height
    const next = points[i + 1].height
    if (curr > prev && curr > next) events.push({ time: points[i].time, height: curr, type: 'HW' })
    else if (curr < prev && curr < next) events.push({ time: points[i].time, height: curr, type: 'LW' })
  }
  return events
}

/** HW/LW events for a single day (10-minute resolution) */
export function dailyHWLW(date: Date, consts: PortConstituents): HWLWEvent[] {
  return findHWLW(dailyTidePoints(date, consts, 10))
}

/** HW/LW for every day in a month */
export function monthlyHWLW(
  year: number,
  month: number,    // 0-indexed
  consts: PortConstituents,
): { date: Date; events: HWLWEvent[] }[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(Date.UTC(year, month, i + 1))
    return { date, events: dailyHWLW(date, consts) }
  })
}

// ─── Lunar phase helpers ─────────────────────────────────────────────────────

/** Known new moon: 6 Jan 2000 18:14 UTC */
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0)
const LUNAR_CYCLE_DAYS  = 29.530589

/**
 * Lunar cycle position: 0 = new moon, 0.5 = full moon.
 * Spring tides occur near 0 and 0.5; neap tides near 0.25 and 0.75.
 */
export function lunarCyclePosition(date: Date): number {
  const days = (date.getTime() - KNOWN_NEW_MOON_MS) / 86_400_000
  return ((days % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS / LUNAR_CYCLE_DAYS
}

export type TidalPhase = 'Spring' | 'Near Spring' | 'Intermediate' | 'Near Neap' | 'Neap'

/** Tidal phase based on lunar cycle position */
export function tidalPhase(date: Date): TidalPhase {
  const pos = lunarCyclePosition(date)
  // Distance from nearest spring (0 = new moon, 0.5 = full moon)
  const d = Math.min(pos, Math.abs(pos - 0.5), Math.abs(pos - 1))
  if (d < 0.06) return 'Spring'
  if (d < 0.12) return 'Near Spring'
  if (d > 0.21) return 'Neap'
  if (d > 0.16) return 'Near Neap'
  return 'Intermediate'
}

// ─── Time formatting ──────────────────────────────────────────────────────────

/** Format a UTC Date as IST time string — 24h "02:30" or 12h "2:30 AM" */
export function toIST(date: Date, format: '24h' | '12h' = '24h'): string {
  if (format === '12h') {
    return date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Format a UTC Date as IST date string */
export function toISTDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
