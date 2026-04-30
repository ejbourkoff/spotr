'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

type Role = 'ATHLETE' | 'COACH' | 'BRAND' | 'FAN'

interface StepOption { label: string; value: string; emoji?: string; subtitle?: string }

interface Step {
  id: string
  lines: string[]        // question text, line-broken
  accentWords?: string[] // words rendered in brand green
  type: 'single' | 'multi' | 'text' | 'photo'
  options?: StepOption[]
  fields?: { key: string; placeholder: string; label: string }[]
}

const PHOTO_STEP: Step = {
  id: 'photo',
  lines: ['ADD YOUR', 'PHOTO'],
  accentWords: ['PHOTO'],
  type: 'photo',
}

// ─── Sport positions ─────────────────────────────────────────────────────────
const POSITIONS: Record<string, StepOption[]> = {
  Football: ['QB','RB','WR','TE','OL','DL','LB','DB','K/P','Other'].map(v => ({ label: v, value: v })),
  Basketball: ['PG','SG','SF','PF','C'].map(v => ({ label: v, value: v })),
  Soccer: ['GK','Defender','Midfielder','Forward'].map(v => ({ label: v, value: v })),
  Baseball: ['Pitcher','Catcher','Infield','Outfield','DH'].map(v => ({ label: v, value: v })),
  Volleyball: ['Outside Hitter','Middle Blocker','Right Side','Setter','Libero'].map(v => ({ label: v, value: v })),
  Track: ['Sprints','Distance','Hurdles','Field Events','Multi-Event'].map(v => ({ label: v, value: v })),
}

const SPORTS: StepOption[] = [
  { label: 'Football', value: 'Football', emoji: '🏈' },
  { label: 'Basketball', value: 'Basketball', emoji: '🏀' },
  { label: 'Soccer', value: 'Soccer', emoji: '⚽' },
  { label: 'Baseball', value: 'Baseball', emoji: '⚾' },
  { label: 'Volleyball', value: 'Volleyball', emoji: '🏐' },
  { label: 'Track & Field', value: 'Track', emoji: '🏃' },
  { label: 'Swimming', value: 'Swimming', emoji: '🏊' },
  { label: 'Tennis', value: 'Tennis', emoji: '🎾' },
  { label: 'Other', value: 'Other', emoji: '🏅' },
]

// ─── Steps per role ───────────────────────────────────────────────────────────
const STEPS: Record<Role, Step[]> = {
  ATHLETE: [
    {
      id: 'sport',
      lines: ['WHAT SPORT', 'DO YOU', 'PLAY?'],
      accentWords: ['PLAY?'],
      type: 'single',
      options: SPORTS,
    },
    {
      id: 'position',
      lines: ['WHAT\'S YOUR', 'POSITION?'],
      accentWords: ['POSITION?'],
      type: 'single',
      options: [], // filled dynamically from selected sport
    },
    {
      id: 'story',
      lines: ['YOUR', 'INFO'],
      accentWords: ['INFO'],
      type: 'text',
      fields: [
        { key: 'name', placeholder: 'Your full name', label: 'YOUR NAME' },
        { key: 'schoolTeam', placeholder: 'School or team name', label: 'SCHOOL / TEAM' },
        { key: 'classYear', placeholder: 'e.g. Sophomore, Senior, Class of 2026', label: 'CLASS YEAR' },
      ],
    },
    {
      id: 'recruiting',
      lines: ['YOUR', 'RECRUITING', 'STATUS'],
      accentWords: ['STATUS'],
      type: 'single',
      options: [
        { label: 'No contact yet', value: 'none', subtitle: 'Building my tape, early in the process' },
        { label: 'Getting coach attention', value: 'attention', subtitle: 'A few coaches follow me / have reached out' },
        { label: 'Actively being recruited', value: 'active', subtitle: 'Regular contact with coaches' },
        { label: 'Have scholarship offers', value: 'offers', subtitle: '1 or more official offers on the table' },
        { label: 'Already committed', value: 'committed', subtitle: 'Verbally committed or signed' },
      ],
    },
    {
      id: 'goals',
      lines: ['WHAT ARE', 'YOU LOOKING', 'FOR?'],
      accentWords: ['FOR?'],
      type: 'multi',
      options: [
        { label: 'NIL Deals', value: 'nil' },
        { label: 'College Recruiting', value: 'recruiting' },
        { label: 'Pro Path', value: 'pro' },
        { label: 'Brand Partnerships', value: 'brands' },
        { label: 'Grow My Following', value: 'following' },
        { label: 'Connect with Coaches', value: 'coaches' },
      ],
    },
    PHOTO_STEP,
  ],
  COACH: [
    {
      id: 'sport',
      lines: ['WHAT SPORT', 'DO YOU', 'COACH?'],
      accentWords: ['COACH?'],
      type: 'multi',
      options: SPORTS,
    },
    {
      id: 'level',
      lines: ['WHAT LEVEL', 'DO YOU', 'COACH?'],
      accentWords: ['COACH?'],
      type: 'single',
      options: [
        { label: 'Youth / Club', value: 'OTHER' },
        { label: 'High School', value: 'OTHER', subtitle: 'Varsity or JV' },
        { label: 'JUCO', value: 'JUCO' },
        { label: 'D3 / NAIA', value: 'D3', subtitle: 'Division III or NAIA' },
        { label: 'D1 / D2', value: 'D1', subtitle: 'Division I or II' },
        { label: 'Professional', value: 'OTHER', subtitle: 'Pro league or semi-pro' },
        { label: 'Private Trainer', value: 'OTHER' },
      ],
    },
    {
      id: 'info',
      lines: ['YOUR', 'INFO'],
      accentWords: ['INFO'],
      type: 'text',
      fields: [
        { key: 'name', placeholder: 'Your full name', label: 'YOUR NAME' },
        { key: 'organization', placeholder: 'School, college, or org', label: 'SCHOOL / ORG' },
      ],
    },
    {
      id: 'goals',
      lines: ['WHAT ARE', 'YOU LOOKING', 'FOR?'],
      accentWords: ['FOR?'],
      type: 'multi',
      options: [
        { label: 'Find Talent', value: 'talent' },
        { label: 'Recruit Athletes', value: 'recruit' },
        { label: 'Scout Prospects', value: 'scout' },
        { label: 'Partner with Brands', value: 'brands' },
        { label: 'Build My Network', value: 'network' },
        { label: 'Share My Methods', value: 'content' },
      ],
    },
    PHOTO_STEP,
  ],
  BRAND: [
    {
      id: 'type',
      lines: ['WHAT TYPE', 'OF BRAND', 'ARE YOU?'],
      accentWords: ['ARE YOU?'],
      type: 'single',
      options: [
        { label: 'Sports Apparel', value: 'Apparel' },
        { label: 'Nutrition & Health', value: 'Nutrition' },
        { label: 'Equipment & Gear', value: 'Equipment' },
        { label: 'Local Business', value: 'Local Business' },
        { label: 'Sports Agency', value: 'Agency' },
        { label: 'Media / Content', value: 'Media' },
        { label: 'NIL Collective', value: 'Collective' },
        { label: 'Other', value: 'Other' },
      ],
    },
    {
      id: 'sports',
      lines: ['WHICH SPORTS', 'DO YOU', 'FOCUS ON?'],
      accentWords: ['FOCUS ON?'],
      type: 'multi',
      options: SPORTS,
    },
    {
      id: 'info',
      lines: ['YOUR', 'INFO'],
      accentWords: ['INFO'],
      type: 'text',
      fields: [
        { key: 'name', placeholder: 'Your name', label: 'YOUR NAME' },
        { key: 'brandName', placeholder: 'Brand or company name', label: 'BRAND NAME' },
      ],
    },
    {
      id: 'goals',
      lines: ['WHAT\'S YOUR', 'GOAL?'],
      accentWords: ['GOAL?'],
      type: 'multi',
      options: [
        { label: 'NIL Partnerships', value: 'nil' },
        { label: 'Content Campaigns', value: 'content' },
        { label: 'Event Sponsorship', value: 'events' },
        { label: 'Grassroots Marketing', value: 'grassroots' },
        { label: 'Find Brand Ambassadors', value: 'ambassadors' },
        { label: 'Support Athletes', value: 'support' },
      ],
    },
    PHOTO_STEP,
  ],
  FAN: [
    {
      id: 'sports',
      lines: ['WHAT SPORTS', 'DO YOU', 'LOVE?'],
      accentWords: ['LOVE?'],
      type: 'multi',
      options: SPORTS,
    },
    {
      id: 'content',
      lines: ['WHAT CONTENT', 'DO YOU', 'WANT?'],
      accentWords: ['WANT?'],
      type: 'multi',
      options: [
        { label: 'Highlights & Reels', value: 'highlights' },
        { label: 'Training Content', value: 'training' },
        { label: 'NIL & Business', value: 'nil' },
        { label: 'Behind the Scenes', value: 'bts' },
        { label: 'Rising Stars', value: 'rising' },
        { label: 'Coach Insights', value: 'coaches' },
      ],
    },
    {
      id: 'goals',
      lines: ['WHO DO YOU', 'WANT TO', 'FOLLOW?'],
      accentWords: ['FOLLOW?'],
      type: 'multi',
      options: [
        { label: 'Local Athletes', value: 'local' },
        { label: 'College Stars', value: 'college' },
        { label: 'Pro Prospects', value: 'pro' },
        { label: 'Coaches & Scouts', value: 'coaches' },
        { label: 'Rising Talent', value: 'rising' },
        { label: 'Everyone', value: 'all' },
      ],
    },
    PHOTO_STEP,
  ],
}

const ROLE_STEP: Step = {
  id: 'role',
  lines: ['WHO', 'ARE', 'YOU?'],
  accentWords: ['YOU?'],
  type: 'single',
  options: [
    { label: 'Athlete', value: 'ATHLETE', emoji: '🏃', subtitle: 'Player, student-athlete, or pro' },
    { label: 'Coach', value: 'COACH', emoji: '📋', subtitle: 'Coach, scout, or trainer' },
    { label: 'Brand', value: 'BRAND', emoji: '⚡', subtitle: 'Brand, collective, or agency' },
    { label: 'Fan', value: 'FAN', emoji: '👥', subtitle: 'Sports fan & supporter' },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function QuestionHeader({ lines, accentWords }: { lines: string[]; accentWords?: string[] }) {
  return (
    <div className="font-display font-black italic text-[56px] leading-[0.88] uppercase tracking-tight mb-8">
      {lines.map((line, i) => {
        const isAccent = accentWords?.some(w => line.includes(w))
        return (
          <div key={i} className={isAccent ? 'text-brand' : 'text-spotr-white'}>
            {line}
          </div>
        )
      })}
    </div>
  )
}

function Tile({ option, selected, onToggle }: { option: StepOption; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all text-left
        ${selected
          ? 'bg-brand/10 border-brand'
          : 'bg-white/[0.04] border-white/[0.08] active:bg-white/[0.07]'
        }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {option.emoji && <span className="text-xl flex-shrink-0">{option.emoji}</span>}
        <div className="min-w-0">
          <div className={`font-display font-black italic uppercase text-[18px] tracking-tight leading-tight ${selected ? 'text-brand' : 'text-spotr-white'}`}>
            {option.label}
          </div>
          {option.subtitle && (
            <div className="text-[11px] text-spotr-white/40 mt-0.5 font-sans">{option.subtitle}</div>
          )}
        </div>
      </div>
      <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors
        ${selected ? 'bg-brand border-brand' : 'border-white/20'}`}>
        {selected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        )}
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [stepIndex, setStepIndex] = useState(0) // 0 = role step
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.push('/auth/login')
  }, [router])

  const steps = role ? STEPS[role] : []
  const totalSteps = role ? steps.length + 1 : 5
  const displayStep = stepIndex + 1

  const currentStep: Step = stepIndex === 0 ? ROLE_STEP : steps[stepIndex - 1]

  // For position step (athlete): populate from selected sport
  const enrichedStep: Step = (() => {
    if (currentStep.id === 'position' && role === 'ATHLETE') {
      const sport = answers.sport as string
      return {
        ...currentStep,
        options: POSITIONS[sport] || [{ label: 'N/A', value: 'N/A' }],
      }
    }
    return currentStep
  })()

  const currentAnswer = answers[enrichedStep.id]

  const canContinue = (() => {
    if (enrichedStep.type === 'photo') return true
    if (enrichedStep.type === 'text') {
      const required = enrichedStep.fields?.filter((_f, i) => i === 0) ?? []
      return required.every(f => (answers[f.key] as string)?.trim())
    }
    if (!currentAnswer) return false
    if (enrichedStep.type === 'multi') return Array.isArray(currentAnswer) && currentAnswer.length > 0
    return !!currentAnswer
  })()

  const handleSingle = (value: string) => {
    if (enrichedStep.id === 'role') {
      setRole(value as Role)
      setAnswers(prev => ({ ...prev, role: value }))
    } else {
      setAnswers(prev => ({ ...prev, [enrichedStep.id]: value }))
    }
  }

  const handleMulti = (value: string) => {
    setAnswers(prev => {
      const current: string[] = prev[enrichedStep.id] || []
      return {
        ...prev,
        [enrichedStep.id]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      }
    })
  }

  const handleText = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const handlePhotoUpload = async (file: File) => {
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (data.url) setAnswers(prev => ({ ...prev, avatarUrl: data.url }))
    } catch {}
    setUploading(false)
  }

  const next = async () => {
    const nextIndex = stepIndex + 1
    if (nextIndex > steps.length) {
      await saveProfile()
    } else {
      setStepIndex(nextIndex)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    try {
      if (role === 'ATHLETE') {
        const goals: string[] = answers.goals || []
        await fetch(`${API_BASE}/athletes/profile`, {
          method: 'POST', headers,
          body: JSON.stringify({
            name: answers.name,
            sport: answers.sport,
            position: answers.position,
            schoolTeam: answers.schoolTeam,
            classYear: answers.classYear,
            openToNIL: goals.includes('nil'),
            openToSemiProPro: goals.includes('pro'),
          }),
        })
      } else if (role === 'COACH') {
        await fetch(`${API_BASE}/coaches/profile`, {
          method: 'POST', headers,
          body: JSON.stringify({
            name: answers.name,
            sport: Array.isArray(answers.sport) ? answers.sport : [answers.sport],
            organization: answers.organization,
            schoolLevel: answers.level || 'OTHER',
          }),
        })
      } else if (role === 'BRAND') {
        await fetch(`${API_BASE}/brands/profile`, {
          method: 'POST', headers,
          body: JSON.stringify({
            name: answers.brandName || answers.name,
            organizationType: answers.type,
          }),
        })
      } else if (role === 'FAN') {
        localStorage.setItem('spotr_fan_prefs', JSON.stringify({
          sports: answers.sports,
          content: answers.content,
          following: answers.goals,
        }))
      }
    } catch {}

    if (answers.avatarUrl) {
      try {
        await fetch(`${API_BASE}/auth/me`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ avatarUrl: answers.avatarUrl }),
        })
      } catch {}
    }

    setSaving(false)
    setDone(true)
  }

  // ─── Welcome screen ─────────────────────────────────────────────────────────
  if (done) {
    const firstName = (answers.name as string)?.split(' ')[0] || 'there'
    const roleLabel = role === 'ATHLETE' ? 'athlete' : role === 'COACH' ? 'coach' : role === 'BRAND' ? 'brand' : 'fan'
    const goTo = role === 'ATHLETE' ? '/feed' : role === 'COACH' ? '/discover' : role === 'BRAND' ? '/discover' : '/feed'

    return (
      <main className="min-h-screen bg-spotr-black flex flex-col px-6 py-12">
        <div className="flex-1 flex flex-col justify-center">
          <div className="font-mono text-[10px] font-bold tracking-widest uppercase text-brand mb-6">
            You're in
          </div>
          <div className="font-display font-black italic text-[56px] leading-[0.88] uppercase tracking-tight mb-6">
            <div className="text-spotr-white">YOUR</div>
            <div className="text-spotr-white">SPOTR</div>
            <div className="text-brand">IS READY.</div>
          </div>
          <p className="text-spotr-white/60 text-[15px] leading-relaxed mb-8">
            Welcome, {firstName}. Your {roleLabel} profile is set up.
            {role === 'ATHLETE' && answers.sport && (
              <> We've dialed in your feed for {answers.sport}
              {answers.schoolTeam ? ` at ${answers.schoolTeam}` : ''}.
              </>
            )}
            {role === 'COACH' && (
              <> Your recruiting dashboard is ready.</>
            )}
            {role === 'BRAND' && (
              <> Athletes matching your focus are already on the platform.</>
            )}
            {role === 'FAN' && (
              <> Your personalized feed is ready.</>
            )}
          </p>

          {/* What we set up */}
          <div className="space-y-3 mb-10">
            {[
              role === 'ATHLETE' && answers.sport && `${answers.sport} athlete profile created`,
              role === 'ATHLETE' && answers.recruiting === 'offers' && 'Recruiting profile visible to coaches',
              role === 'ATHLETE' && (answers.goals as string[])?.includes('nil') && 'NIL discovery enabled — brands can find you',
              role === 'COACH' && 'Athlete search dashboard unlocked',
              role === 'BRAND' && 'Athlete discovery feed customized',
              role === 'FAN' && 'Content feed personalized',
              'Profile live on SPOTR',
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-brand/15 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span className="text-spotr-white/70 text-[13px]">{item as string}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push(goTo)}
          className="w-full h-14 bg-brand rounded-2xl font-display font-black italic text-xl uppercase text-spotr-black flex items-center justify-center gap-2"
        >
          Let's go
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </main>
    )
  }

  // ─── Step screen ─────────────────────────────────────────────────────────────
  const progress = (stepIndex / (steps.length + 1)) * 100

  return (
    <main className="min-h-screen bg-spotr-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14 pb-2">
        <div className="font-display font-black italic text-xl uppercase text-spotr-white">
          <span className="text-brand">S</span>POTR
        </div>
        <div className="font-mono text-[10px] font-bold tracking-widest uppercase text-spotr-white/35">
          {displayStep} of {totalSteps}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-4 overflow-y-auto">
        <QuestionHeader lines={enrichedStep.lines} accentWords={enrichedStep.accentWords} />

        {/* Options */}
        {(enrichedStep.type === 'single' || enrichedStep.type === 'multi') && enrichedStep.options && (
          <div className="space-y-2.5">
            {enrichedStep.options.map(opt => (
              <Tile
                key={opt.value + opt.label}
                option={opt}
                selected={
                  enrichedStep.type === 'single'
                    ? (enrichedStep.id === 'role' ? answers.role === opt.value : currentAnswer === opt.value)
                    : (Array.isArray(currentAnswer) && currentAnswer.includes(opt.value))
                }
                onToggle={() =>
                  enrichedStep.type === 'single' ? handleSingle(opt.value) : handleMulti(opt.value)
                }
              />
            ))}
          </div>
        )}

        {/* Text inputs */}
        {enrichedStep.type === 'text' && enrichedStep.fields && (
          <div className="space-y-4">
            {enrichedStep.fields.map(field => (
              <div key={field.key}>
                <label className="font-mono text-[9px] font-bold tracking-widest uppercase text-spotr-white/35 block mb-1.5">
                  {field.label}
                </label>
                <input
                  value={(answers[field.key] as string) || ''}
                  onChange={e => handleText(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full h-12 px-4 bg-white/[0.06] border border-white/[0.08] rounded-xl text-spotr-white placeholder:text-spotr-white/25 font-sans text-[15px] outline-none focus:border-brand/40 transition-colors"
                />
              </div>
            ))}
          </div>
        )}

        {/* Photo upload */}
        {enrichedStep.type === 'photo' && (
          <div className="flex flex-col items-center gap-6 pt-4">
            <label className="cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handlePhotoUpload(file)
                }}
              />
              <div className="w-36 h-36 rounded-full border-2 border-dashed border-white/20 group-active:border-brand/60 flex items-center justify-center overflow-hidden bg-white/[0.04] transition-colors relative">
                {uploading ? (
                  <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                ) : answers.avatarUrl ? (
                  <img src={answers.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-spotr-white/30">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </div>
            </label>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-spotr-white/30">
              {answers.avatarUrl ? 'Tap to change' : 'Tap to add photo'}
            </p>
          </div>
        )}

        {/* Multi-select hint */}
        {enrichedStep.type === 'multi' && (
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-spotr-white/25 mt-3">
            Select all that apply
          </p>
        )}
      </div>

      {/* Bottom */}
      <div className="px-6 pb-8 pt-2 flex-shrink-0">
        <button
          onClick={next}
          disabled={!canContinue || saving}
          className="w-full h-14 bg-brand disabled:opacity-30 rounded-2xl font-display font-black italic text-xl uppercase text-spotr-black flex items-center justify-center gap-2 transition-opacity"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-spotr-black/50 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {stepIndex === steps.length ? 'Finish' : enrichedStep.type === 'photo' && !answers.avatarUrl ? 'Skip' : 'Continue'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0F" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </>
          )}
        </button>

        {/* Progress bar */}
        <div className="mt-4 h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </main>
  )
}
