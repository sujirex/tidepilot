import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import Navbar from '@/components/layout/Navbar'

const geist = localFont({ src: './fonts/Geist.woff2', variable: '--font-geist', weight: '100 900', display: 'swap' })
const geistMono = localFont({ src: './fonts/GeistMono.woff2', variable: '--font-geist-mono', weight: '100 900', display: 'swap' })

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFBFD' },
    { media: '(prefers-color-scheme: dark)', color: '#07080D' },
  ],
}

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
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
        {/* Saved choice wins, otherwise the device setting. Runs before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = null;
            try { t = localStorage.getItem('tidepilot-theme'); } catch (e) {}
            if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', t);
          })();
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="tp-footer">
            <a className="tp-credit" href="https://sujikumar.com/" rel="author" title="Built by Suji Kumar C — Digital Maritime Engineer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ss-emblem.svg" alt="" width={20} height={20} />
              <span>Built by <b>Suji Kumar C</b> · sujikumar.com</span>
            </a>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
