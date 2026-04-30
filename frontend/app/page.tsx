'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [splash, setSplash] = useState(true)
  const [logoVisible, setLogoVisible] = useState(false)
  const [taglineVisible, setTaglineVisible] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check auth in background while splash plays
    authApi.getMe()
      .then((r) => {
        router.push('/feed')
      })
      .catch(() => setChecking(false))
  }, [router])

  useEffect(() => {
    // Staggered animation sequence
    const t1 = setTimeout(() => setLogoVisible(true), 300)
    const t2 = setTimeout(() => setTaglineVisible(true), 900)
    const t3 = setTimeout(() => setCtaVisible(true), 1400)
    const t4 = setTimeout(() => setSplash(false), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  // Full-screen splash
  if (splash) {
    return (
      <div className="min-h-screen bg-spotr-black flex flex-col items-center justify-center">
        {/* Animated green ring */}
        <div className="relative flex items-center justify-center mb-8">
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-brand/20 transition-all duration-1000"
            style={{ transform: logoVisible ? 'scale(1)' : 'scale(0.5)', opacity: logoVisible ? 1 : 0 }}
          />
          <div
            className="absolute w-24 h-24 rounded-full border border-brand/10 transition-all duration-1000 delay-100"
            style={{ transform: logoVisible ? 'scale(1)' : 'scale(0.3)', opacity: logoVisible ? 1 : 0 }}
          />
          <div
            className="transition-all duration-700"
            style={{ transform: logoVisible ? 'scale(1)' : 'scale(0.6)', opacity: logoVisible ? 1 : 0 }}
          >
            <span className="font-display font-black italic text-6xl uppercase tracking-tight text-spotr-white">
              <span className="text-brand">S</span>POTR
            </span>
          </div>
        </div>
        <p
          className="font-mono text-xs uppercase tracking-widest text-spotr-white/30 transition-all duration-700"
          style={{ opacity: taglineVisible ? 1 : 0, transform: taglineVisible ? 'translateY(0)' : 'translateY(8px)' }}
        >
          The platform for athletes
        </p>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-spotr-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main
      className="min-h-screen bg-spotr-black flex flex-col"
      style={{ opacity: ctaVisible ? 1 : 0, transition: 'opacity 0.5s' }}
    >
      {/* Mobile-first layout — centered column */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 pt-16 pb-10 max-w-md mx-auto w-full">

        {/* Top: logo + tagline */}
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="relative flex items-center justify-center mb-2">
            {/* Subtle glow ring */}
            <div className="absolute w-24 h-24 rounded-full bg-brand/10 blur-2xl" />
            <span className="relative font-display font-black italic text-7xl uppercase leading-none text-spotr-white">
              <span className="text-brand">S</span>POTR
            </span>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-spotr-white/30 text-center">
            The platform for athletes
          </p>
        </div>

        {/* Middle: role pills */}
        <div className="flex flex-col gap-3 w-full mt-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-spotr-white/25 text-center mb-1">
            Join as
          </p>
          {[
            { label: 'Athlete', emoji: '🏃', sub: 'Recruiting · NIL · Highlights' },
            { label: 'Coach', emoji: '📋', sub: 'Discover & recruit talent' },
            { label: 'Brand', emoji: '⚡', sub: 'NIL deals & athlete partnerships' },
            { label: 'Fan', emoji: '👥', sub: 'Follow athletes & highlights' },
          ].map((r) => (
            <Link
              key={r.label}
              href={`/auth/signup?role=${r.label.toUpperCase()}`}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-spotr-white/[0.04] border border-spotr-white/[0.08] hover:bg-brand/10 hover:border-brand/40 transition-all group"
            >
              <span className="text-2xl">{r.emoji}</span>
              <div className="flex-1">
                <p className="font-display font-black italic text-lg uppercase text-spotr-white group-hover:text-brand transition-colors">
                  {r.label}
                </p>
                <p className="text-xs text-spotr-white/30">{r.sub}</p>
              </div>
              <svg className="w-4 h-4 text-spotr-white/20 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Bottom: sign in */}
        <div className="flex flex-col items-center gap-4 w-full mt-8">
          <Link
            href="/auth/login"
            className="w-full py-4 rounded-2xl border border-spotr-white/10 text-center font-display font-black italic text-lg uppercase text-spotr-white/60 hover:text-spotr-white hover:border-spotr-white/25 transition-all tracking-wider"
          >
            Sign In
          </Link>
          <p className="text-[10px] text-spotr-white/15 font-mono uppercase tracking-widest text-center">
            Athletes · Coaches · Brands · Fans
          </p>
        </div>
      </div>
    </main>
  )
}
