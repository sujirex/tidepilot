'use client'

import Link from 'next/link'
import { Waves, TrendingUp, CalendarRange, CalendarDays, BarChart3, Scale, Bell, Anchor, Construction, Ship, MapPin, Clock, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

// ─── Data ─────────────────────────────────────────────────────────────────────

const VIEWS = [
  {
    href: '/',
    icon: Waves,
    title: 'Home — Live Tide',
    color: 'var(--g1)',
    desc: 'Today\'s full 24-hour tide curve for any of the 12 ports. Shows the live current water level, a countdown to the next High Water or Low Water, and the tidal phase. Use the date arrows to browse past or future days.',
  },
  {
    href: '/daily',
    icon: TrendingUp,
    title: 'Daily',
    color: 'var(--accent-lw)',
    desc: 'Detailed tide chart for a single chosen date. Pick any port and any date to get the precise HW/LW times and heights, the tidal phase badge, and an interactive curve you can hover for height at any hour.',
  },
  {
    href: '/weekly',
    icon: CalendarRange,
    title: 'Weekly',
    color: 'var(--g3)',
    desc: 'A 7-day planner showing all HW/LW events for each day of the week. Ideal for scheduling berthing windows, dredging operations, or crew transfers across a work week. Navigate week-by-week with the arrows.',
  },
  {
    href: '/monthly',
    icon: CalendarDays,
    title: 'Monthly',
    color: 'var(--spark)',
    desc: 'Full month table with every HW/LW event, plus three key statistics at the top — Peak High Water, Lowest Low Water, and Spring Tide days. Good for monthly planning, cargo scheduling, and vessel arrival windows.',
  },
  {
    href: '/annual',
    icon: BarChart3,
    title: 'Annual',
    color: 'var(--accent-hw)',
    desc: 'Yearly overview with HAT and LAT (Highest and Lowest Astronomical Tides), a month-by-month summary, and a Shipbuilding & Dry-Dock Planning Guide that highlights the best months for launching, keel laying, and trials at each port.',
  },
  {
    href: '/compare',
    icon: Scale,
    title: 'Compare',
    color: 'var(--ok)',
    desc: 'Side-by-side comparison of two ports on the same day. Both tide curves overlay on one chart (teal vs indigo), and HW/LW events are listed in two columns. Use this to coordinate multi-port convoy movements or transfers.',
  },
  {
    href: '/reminders',
    icon: Bell,
    title: 'Reminders',
    color: 'var(--t-danger)',
    desc: 'Set personal reminders for tide-sensitive events — drydock entry, cargo loading, vessel departure, sea trials, and more. Upcoming reminders appear as a strip on the Home page. All data is stored locally in your browser.',
  },
]

const PHASES = [
  { name: 'Spring',       color: 'var(--accent-hw)', bg: 'color-mix(in srgb, var(--accent-hw) 12%, transparent)', border: 'color-mix(in srgb, var(--accent-hw) 35%, transparent)', desc: 'New or full moon — maximum tidal range. Highest HW, lowest LW. Best for deep-draught vessel access.' },
  { name: 'Near Spring',  color: 'var(--spark)', bg: 'color-mix(in srgb, var(--spark) 12%, transparent)', border: 'color-mix(in srgb, var(--spark) 32%, transparent)', desc: '1–2 days either side of spring. Range still large, approaching or leaving maximum.' },
  { name: 'Intermediate', color: 'var(--g1)', bg: 'color-mix(in srgb, var(--g1) 10%, transparent)', border: 'color-mix(in srgb, var(--g1) 30%, transparent)', desc: 'Midway between spring and neap. Moderate range — average planning conditions.' },
  { name: 'Near Neap',    color: 'var(--g3)', bg: 'color-mix(in srgb, var(--g3) 12%, transparent)', border: 'color-mix(in srgb, var(--g3) 35%, transparent)', desc: '1–2 days from neap. Range is shrinking or growing toward neap tides.' },
  { name: 'Neap',         color: 'var(--accent-lw)', bg: 'color-mix(in srgb, var(--accent-lw) 12%, transparent)', border: 'color-mix(in srgb, var(--accent-lw) 35%, transparent)', desc: 'Quarter moon — minimum tidal range. Smallest HW/LW difference. Preferred for harbour maintenance, berthing of shallow-draught vessels.' },
]

const GLOSSARY = [
  { term: 'HW',          def: 'High Water — the peak of a tidal cycle. Heights are in metres above Chart Datum.' },
  { term: 'LW',          def: 'Low Water — the trough of a tidal cycle.' },
  { term: 'MHWS',        def: 'Mean High Water Springs — average height of spring HW events. Used for air draught calculations.' },
  { term: 'MLWS',        def: 'Mean Low Water Springs — average height of spring LW events. Used for under-keel clearance.' },
  { term: 'Spring Range', def: 'MHWS − MLWS. The typical height difference from LW to HW during spring tides.' },
  { term: 'HAT',         def: 'Highest Astronomical Tide — the highest level the tide can reach (annual view).' },
  { term: 'LAT',         def: 'Lowest Astronomical Tide — the lowest level reachable; defines Chart Datum at most ports.' },
  { term: 'MSL',         def: 'Mean Sea Level — shown as a dashed green line on the tide chart.' },
  { term: 'Chart Datum', def: 'The reference zero level for tide heights, roughly LAT. Heights shown are metres above this datum.' },
  { term: 'IST',         def: 'Indian Standard Time (UTC+5:30). All times in TidePilot are displayed in IST.' },
]

const TIPS = [
  { icon: Anchor, text: 'For vessel arrival planning, use the Monthly view to find spring tide windows with the highest HW, then drill into Daily for exact times.' },
  { icon: Construction, text: 'For drydock or slipway operations, Annual shows the best months by port. Spring tides give maximum tidal drop for dry-docking.' },
  { icon: Ship, text: 'Use Compare to check if two ports have HW at similar times — useful for coordinating multi-port convoy schedules.' },
  { icon: MapPin, text: 'Gulf of Khambhat ports (Dahej, Bhavnagar) have India\'s largest tidal ranges (7–9 m spring). Always verify keel clearance before entry.' },
  { icon: Bell, text: 'Set a Reminder for your drydock date or sea trial window so it shows up on the Home page countdown.' },
  { icon: Clock, text: 'Toggle between 24h and 12h time format using the "24h / 12h" button in the top-right of the navbar.' },
  { icon: Moon, text: 'Tide predictions are harmonic — they use published NHO and Admiralty constants. For safety-critical navigation, always cross-check with the official NHO India Annual Tide Tables.' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="min-h-screen pt-14" style={{ background: 'var(--bg-page)' }}>

      {/* Hero */}
      <div className="ocean-bg py-10">
        <div className="container-tp">
          <span className="section-tag mb-3"
            style={{ color: 'color-mix(in srgb, var(--ink) 90%, transparent)', background: 'color-mix(in srgb, var(--ink) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--ink) 25%, transparent)' }}>
            📖 User Guide
          </span>
          <h1 className="font-display font-bold text-3xl mt-2 hero-gradient-text">How to Use TidePilot</h1>
          <p className="mt-1 text-sm" style={{ color: 'color-mix(in srgb, var(--ink) 72%, transparent)', maxWidth: 520 }}>
            Harmonic tide predictions for 12 major Indian ports — everything you need to plan tide-sensitive marine operations.
          </p>
        </div>
      </div>

      <div className="container-tp py-8 space-y-10">

        {/* What is TidePilot */}
        <section>
          <h2 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>What is TidePilot?</h2>
          <div className="glass-card p-5 text-sm leading-relaxed space-y-3" style={{ color: 'var(--text-secondary)' }}>
            <p>
              TidePilot is a harmonic tide prediction tool covering <strong style={{ color: 'var(--text-primary)' }}>12 major Indian ports</strong> across Gujarat, the West Coast, East Coast, and Andaman & Nicobar Islands. It uses the standard 8-constituent harmonic method (M2, S2, N2, K2, K1, O1, P1, Q1) with published NHO India and Admiralty Tide Table constants.
            </p>
            <p>
              All predictions run <strong style={{ color: 'var(--text-primary)' }}>entirely in your browser</strong> — no server, no internet required after the page loads. Times are displayed in <strong style={{ color: 'var(--text-primary)' }}>IST (UTC+5:30)</strong> throughout.
            </p>
            <p>
              TidePilot is intended as a planning aid. For safety-critical navigation, always verify against the current official <strong style={{ color: 'var(--text-primary)' }}>NHO India Annual Tide Tables</strong>.
            </p>
          </div>
        </section>

        {/* The Seven Views */}
        <section>
          <h2 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>The Seven Views</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {VIEWS.map(v => (
              <Link
                key={v.href}
                href={v.href}
                className="glass-card p-5 block transition-opacity hover:opacity-80"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <v.icon size={22} style={{ color: v.color, flexShrink: 0 }} aria-hidden="true" />
                  <span className="font-display font-semibold text-sm" style={{ color: v.color }}>{v.title}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{v.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Reading the tide chart */}
        <section>
          <h2 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Reading the Tide Chart</h2>
          <div className="glass-card p-5 space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>

            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--g1)' }} />
              <div>
                <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Teal area — tide curve</div>
                The filled area shows water height (metres above Chart Datum) across the 24-hour period. The curve rises to High Water and falls to Low Water roughly every 6 hours for semidiurnal ports.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--accent-hw)' }} />
              <div>
                <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Amber dot — High Water (HW)</div>
                Marked with the height in metres above the dot. This is when the tide is at its peak for that tidal cycle.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--accent-lw)' }} />
              <div>
                <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Blue dot — Low Water (LW)</div>
                Marked with the height below the dot. Most ports have LW near 0.5–1.0 m above Chart Datum. Kochi and Chennai have very small ranges.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--ok)' }} />
              <div>
                <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Green dashed line — MSL</div>
                Mean Sea Level for the port. Useful reference for air draught and bridge clearance estimates.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: 'var(--t-danger)' }} />
              <div>
                <div className="font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Red vertical line — Now</div>
                Appears only when viewing today. Shows the current time so you can read off the present water level from the curve.
              </div>
            </div>

          </div>
        </section>

        {/* Tidal phases */}
        <section>
          <h2 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Tidal Phases Explained</h2>
          <div className="space-y-3">
            {PHASES.map(p => (
              <div key={p.name} className="glass-card p-4 flex items-start gap-4">
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-mono font-semibold flex-shrink-0 mt-0.5"
                  style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
                >
                  {p.name}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            Phase is calculated from lunar cycle position — 0 = New Moon (spring), 0.25 = First Quarter (neap), 0.5 = Full Moon (spring), 0.75 = Last Quarter (neap).
          </p>
        </section>

        {/* Port coverage */}
        <section>
          <h2 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Port Coverage</h2>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ background: 'color-mix(in srgb, var(--g1) 10%, transparent)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>PORT</th>
                  <th className="text-left px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>REGION</th>
                  <th className="text-right px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>SPRING RANGE</th>
                  <th className="text-left px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>NOTE</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Dahej',       region: 'Gujarat',       range: '7.6 m', note: 'NHO secondary port, extreme range'     },
                  { name: 'Bhavnagar',   region: 'Gujarat',       range: '8.2 m', note: 'NHO reference port, highest range'     },
                  { name: 'Hazira',      region: 'Gujarat',       range: '5.6 m', note: 'Gulf of Khambhat south entry'          },
                  { name: 'Kandla',      region: 'Gujarat',       range: '4.2 m', note: 'Gulf of Kutch'                        },
                  { name: 'Mumbai',      region: 'West Coast',    range: '4.3 m', note: 'Apollo Bunder reference station'      },
                  { name: 'Mormugao',   region: 'West Coast',    range: '2.3 m', note: 'Goa'                                  },
                  { name: 'Kochi',       region: 'West Coast',    range: '0.9 m', note: 'Mixed diurnal, small range'           },
                  { name: 'Chennai',     region: 'East Coast',    range: '1.4 m', note: 'Semidiurnal, small range'             },
                  { name: 'Vizag',       region: 'East Coast',    range: '1.1 m', note: 'Visakhapatnam'                       },
                  { name: 'Paradip',     region: 'East Coast',    range: '2.3 m', note: 'Odisha'                              },
                  { name: 'Kolkata',     region: 'East Coast',    range: '4.7 m', note: 'Hooghly River amplification'          },
                  { name: 'Port Blair',  region: 'Islands',       range: '1.9 m', note: 'Andaman & Nicobar'                   },
                ].map((p, i) => (
                  <tr key={p.name}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--g1) 3%, transparent)',
                    }}>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{p.region}</td>
                    <td className="px-4 py-2.5 text-right font-bold" style={{ color: 'var(--g1)' }}>{p.range}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Glossary */}
        <section>
          <h2 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Glossary</h2>
          <div className="glass-card divide-y" style={{ borderColor: 'var(--border)' }}>
            {GLOSSARY.map(g => (
              <div key={g.term} className="flex gap-4 px-5 py-3 items-baseline">
                <span className="font-mono font-bold text-xs flex-shrink-0 w-24" style={{ color: 'var(--g1)' }}>{g.term}</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{g.def}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section>
          <h2 className="font-display font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Planning Tips</h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {TIPS.map((t, i) => (
              <div key={i} className="glass-card p-4 flex gap-3">
                <t.icon size={18} style={{ color: 'var(--g3)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section>
          <div className="glass-card p-5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)', borderLeft: '3px solid color-mix(in srgb, var(--accent-hw) 60%, transparent)' }}>
            <strong style={{ color: 'var(--accent-hw)' }}>Disclaimer — </strong>
            TidePilot predictions are based on harmonic constants from NHO India Tide Tables and Admiralty Tide Tables Vol. 4. Predictions may differ from observed tides due to meteorological surge, river discharge, and local bathymetric effects. <strong style={{ color: 'var(--text-secondary)' }}>Always cross-check with official NHO India Annual Tide Tables before any safety-critical operation.</strong>
          </div>
        </section>

      </div>
    </div>
  )
}
