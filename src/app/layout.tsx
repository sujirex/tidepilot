import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: {
    default: 'TidePilot — Indian Tide Predictions',
    template: '%s | TidePilot',
  },
  description:
    'Accurate tide tables for 12 major Indian ports including Dahej, Bhavnagar, Kandla, Mumbai and more. ' +
    'Three source layers — NHO official, TPXO9 global model, Hazira proxy — one harmonic engine.',
  keywords: [
    'tide table india', 'dahej tide', 'bhavnagar tide', 'kandla tide', 'mumbai tide',
    'gulf of khambhat tides', 'indian tide prediction', 'NHO tide tables', 'tidepilot',
  ],
  authors: [{ name: 'Suji Kumar C', url: 'https://sujikumar.com' }],
  openGraph: {
    title: 'TidePilot — Indian Tide Predictions',
    description: 'Three source layers, one engine. Accurate tide tables for 12 Indian ports.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
