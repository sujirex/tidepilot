'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme      = 'dark' | 'light'
export type TimeFormat = '24h' | '12h'

interface ThemeContextType {
  theme:            Theme
  toggle:           () => void
  timeFormat:       TimeFormat
  toggleTimeFormat: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme:            'light',
  toggle:           () => {},
  timeFormat:       '24h',
  toggleTimeFormat: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,      setTheme]      = useState<Theme>('light')
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h')

  useEffect(() => {
    // The head script already applied the saved choice or the device setting.
    const applied = document.documentElement.getAttribute('data-theme')
    if (applied === 'light' || applied === 'dark') setTheme(applied)

    const savedFmt = localStorage.getItem('tidepilot-timefmt') as TimeFormat | null
    if (savedFmt === '12h' || savedFmt === '24h') setTimeFormat(savedFmt)

    // Follow the device until the user picks a theme.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      let saved: string | null = null
      try { saved = localStorage.getItem('tidepilot-theme') } catch {}
      if (saved === 'light' || saved === 'dark') return
      const next: Theme = mq.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', next)
      setTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = () => setTheme(t => {
    const next: Theme = t === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('tidepilot-theme', next) } catch {}
    return next
  })

  const toggleTimeFormat = () => {
    setTimeFormat(f => {
      const next = f === '24h' ? '12h' : '24h'
      localStorage.setItem('tidepilot-timefmt', next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, timeFormat, toggleTimeFormat }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
