'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

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
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const light = theme === 'light'

  const current = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

  return (
    <header className="tp-header">
      <div className="tp-nav">
        {/* Logo */}
        <Link href="/" className="tp-brand" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ss-emblem.svg" alt="SS emblem" width={36} height={36} />
          <span>
            <b>TidePilot</b>
            <small>Indian Tides</small>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`tp-link${current === link.href ? ' active' : ''}`}
              aria-current={current === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* 24h / 12h toggle */}
          <button
            type="button"
            onClick={toggleTimeFormat}
            aria-label="Toggle time format"
            title={`Switch to ${timeFormat === '24h' ? '12-hour' : '24-hour'} format`}
            className="tp-icon-btn"
          >
            {timeFormat}
          </button>

          {/* Dark / light toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
            title={light ? 'Switch to dark mode' : 'Switch to light mode'}
            className="tp-icon-btn"
          >
            {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="tp-icon-btn tp-menu-btn"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="tp-menu">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`tp-link${current === link.href ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
