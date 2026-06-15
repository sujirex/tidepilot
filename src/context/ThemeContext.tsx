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
  theme:            'dark',
  toggle:           () => {},
  timeFormat:       '24h',
  toggleTimeFormat: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,      setTheme]      = useState<Theme>('dark')
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h')

  useEffect(() => {
    const savedTheme = localStorage.getItem('tidepilot-theme') as Theme | null
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme)

    const savedFmt = localStorage.getItem('tidepilot-timefmt') as TimeFormat | null
    if (savedFmt === '12h' || savedFmt === '24h') setTimeFormat(savedFmt)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tidepilot-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

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
