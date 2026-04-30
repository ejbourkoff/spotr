# SPOTR — Design System

## Brand Identity

SPOTR is a dark-first mobile sports platform. The visual language is bold, athletic, and condensed — inspired by sports broadcast graphics.

## Colors

| Token | Hex | Usage |
|---|---|---|
| `brand` / `text-brand` | `#00E87A` | Primary accent — buttons, selected states, highlights, logo S |
| `spotr-black` | `#0D0D0F` | App background |
| `spotr-white` | `#F4F4F0` | Primary text |
| Muted text | `rgba(244,244,240,0.4)` | Secondary labels |
| Card bg | `rgba(244,244,240,0.04)` | Subtle surface |
| Card border | `rgba(244,244,240,0.08)` | Default border |
| Selected card bg | `rgba(0,232,122,0.10)` | Tile selected state |
| Selected card border | `#00E87A` | Tile selected state |

Tailwind config: `tailwind.config.js` — `brand`, `spotr-black`, `spotr-white` are custom tokens.

## Typography

| Font | Variable | Usage |
|---|---|---|
| Barlow Condensed | `font-display` | Headlines, CTAs, logo, tiles — always bold italic uppercase |
| Barlow | `font-sans` | Body text, inputs, descriptions |
| Space Mono | `font-mono` | Labels, step indicators, metadata |

Google Fonts loaded in `app/layout.tsx`.

### Type Scale Patterns

```
Display headline:   font-display font-black italic text-5xl+ uppercase leading-none
Section label:      font-mono text-xs uppercase tracking-widest text-spotr-white/40
Body:               font-sans text-sm text-spotr-white/70
CTA button:         font-display font-black italic text-lg uppercase tracking-wider
```

## Component Patterns

### Selection Tile
Full-width row. Green border + tinted bg when selected. Check circle top-right.
```
Selected:  bg-brand/10  border-brand       text-brand
Idle:      bg-white/4   border-white/8     text-white/65
```

### CTA Button (primary)
```
bg-brand text-spotr-black font-display font-black italic uppercase rounded-2xl h-14
```

### Input Field
```
bg-white/5 border border-white/10 text-spotr-white placeholder-white/20 rounded-xl
focus: ring-brand/50 border-brand/50
```

### Card / Surface
```
bg-spotr-white/[0.04] border border-spotr-white/[0.08] rounded-2xl
hover: bg-brand/10 border-brand/40
```

### Progress Bar
```
height: 3px  bg-white/7  rounded
fill:   bg-brand
```

### Step Pill
```
font-mono text-xs uppercase tracking-widest
bg-white/6 text-white/35 px-2 py-1 rounded-md
```

## Screens Built

All screens use the dark background (`bg-spotr-black`) with no global nav on auth/landing/onboarding pages.

### Mobile-first
Max width for mobile-style screens: `max-w-md mx-auto`. The app is designed at 390px width (iPhone 14 Pro) but works responsively.

## Logo

```
<span class="font-display font-black italic text-spotr-white uppercase">
  <span class="text-brand">S</span>POTR
</span>
```

The `S` is always `text-brand` green. Never render the logo in lowercase.

## Navigation

- **Bottom tab bar** on mobile (md:hidden)
- **Left sidebar** on desktop (hidden md:flex)
- **Hidden entirely** on: `/`, `/auth/*`, `/onboarding`

Nav is in `components/Navigation.tsx`. It reads the auth token and shows role-appropriate tabs.
