import './globals.css'
import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed, Space_Mono } from 'next/font/google'
import Navigation from '@/components/Navigation'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'SPOTR',
  description: 'The network for athletes, coaches, and brands',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} ${barlowCondensed.variable} ${spaceMono.variable} font-sans`}>
        <Navigation />
        <div id="app-shell">
          {children}
        </div>
      </body>
    </html>
  )
}
