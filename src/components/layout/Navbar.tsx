'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

/** TidePilot wave emblem — blue gradient bg, double white wave */
function TideEmblem({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emblGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A9696" />
          <stop offset="100%" stopColor="#0DC8C8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#emblGrad)" />
      <path
        d="M4 13 C8.5 8, 12 18, 16 13 C20 8, 23.5 18, 28 13"
        stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"
      />
      <path
        d="M4 21 C8.5 15, 12 26, 16 21 C20 15, 23.5 26, 28 21"
        stroke="white" strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

const NAV_LINKS = [
  { href: '/',           label: 'Home'      },
  { href: '/daily',      label: 'Daily'     },
  { href: '/weekly',     label: 'Weekly'    },
  { href: '/monthly',    label: 'Monthly'   },
  { href: '/annual',     label: 'Annual'    },
  { href: '/compare',    label: 'Compare'   },
  { href: '/reminders',  label: 'Reminders' },
  { href: '/guide',      label: 'Guide'     },
]

export default function Navbar() {
  const { theme, toggle, timeFormat, toggleTimeFormat } = useTheme()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const light = theme === 'light'

  const current = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

  return (
    <header className="fixed top-0 left-0 right-0 z-50 navbar-glass navbar-forced-dark">
      <div className="container-tp">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <TideEmblem size={32} />
            <div>
              <span className="font-display font-bold text-base leading-none"
                style={{ color: 'var(--text-primary)' }}>
                TidePilot
              </span>
              <span className="block text-[9px] font-mono tracking-widest uppercase -mt-0.5"
                style={{ color: 'var(--accent-cyan)' }}>
                Indian Tides
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={current === link.href
                  ? { color: '#ffffff', background: 'rgba(10,150,150,0.20)', boxShadow: '0 0 10px rgba(10,150,150,0.28)' }
                  : { color: 'var(--text-secondary)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* 24h / 12h toggle */}
            <button
              onClick={toggleTimeFormat}
              aria-label="Toggle time format"
              title={`Switch to ${timeFormat === '24h' ? '12-hour' : '24-hour'} format`}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-accent)',
                color: 'var(--accent-blue)',
                letterSpacing: '0.04em',
              }}
            >
              {timeFormat}
            </button>

            {/* Dark / light toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden pb-4 pt-2 flex flex-col gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={current === link.href
                  ? { color: '#ffffff', background: 'rgba(10,150,150,0.18)' }
                  : { color: 'var(--text-secondary)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
