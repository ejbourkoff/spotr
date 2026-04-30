# SPOTR — Features & Pages

## Roles

| Role | Description |
|---|---|
| `ATHLETE` | Posts highlights, manages recruiting profile, signs NIL deals |
| `COACH` | Discovers athletes, saves to recruiting lists, sends offers |
| `BRAND` | Finds athletes for NIL, sends structured offers, tracks deals |
| `FAN` | Follows athletes, views highlights and feed |

## Pages

### Public / Auth
| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — animated SPOTR splash, 4 role tiles, sign in |
| `/auth/signup` | `app/auth/signup/page.tsx` | Signup — role picker (Athlete/Coach/Brand/Fan), email, password. Redirects to `/onboarding` |
| `/auth/login` | `app/auth/login/page.tsx` | Login — email + password |

### Onboarding
| Route | File | Description |
|---|---|---|
| `/onboarding` | `app/onboarding/page.tsx` | Multi-step Spotlight-style onboarding. Branches by role. Saves profile on completion |

**Athlete flow (6 steps):**
1. Role selection
2. Sport (Football, Basketball, Soccer, Baseball, Volleyball, Track, Swimming, Tennis, Other)
3. Position (dynamic from sport)
4. Info — name, school/team, class year
5. Recruiting status — No contact / Getting attention / Actively recruited / Have offers / Committed
6. Goals — NIL Deals, College Recruiting, Pro Path, Brand Partnerships, Grow Following, Connect with Coaches

**Coach flow (5 steps):** Sport(s) → Level → Info → Goals

**Brand flow (5 steps):** Type → Sports → Info → Goals

**Fan flow (4 steps):** Sports → Content preferences → Goals

### Feed & Social
| Route | File | Description |
|---|---|---|
| `/feed` | `app/feed/page.tsx` | Main social feed — posts with likes, comments, save |
| `/reels` | `app/reels/page.tsx` | Vertical video reel feed |
| `/discover` | `app/discover/page.tsx` | Athlete discovery |

### Messaging
| Route | File | Description |
|---|---|---|
| `/messages` | `app/messages/page.tsx` | DM inbox — thread list, filter chips (All/Requests/Brands/Coaches/Athletes/Unread), compose modal with live user search |

**Compose modal features:**
- Search all users by name (debounced 300ms, hits `GET /api/users/search?q=...`)
- Shows display name, role pill, sport/org sub-label, Connected badge
- Non-connected users get a "Goes to their Requests" notice + optional follow request toggle
- Requests filter chip shows red badge count for unread received messages

### Athlete Profiles
| Route | File | Description |
|---|---|---|
| `/athlete/profile` | `app/athlete/profile/page.tsx` | Own profile edit |
| `/athlete/profile/[id]` | `app/athlete/profile/[id]/page.tsx` | View another athlete |
| `/athletes/[slug]` | `app/athletes/[slug]/page.tsx` | Public athlete profile page |
| `/a/[code]` | `app/a/[code]/page.tsx` | Short link redirect for athlete profiles |

### Coach Tools
| Route | File | Description |
|---|---|---|
| `/coach/discover` | `app/coach/discover/page.tsx` | Search/filter athletes for recruiting |
| `/coach/onboarding` | `app/coach/onboarding/page.tsx` | Legacy coach onboarding (superseded by `/onboarding`) |

### Brand Tools
| Route | File | Description |
|---|---|---|
| `/brand/search` | `app/brand/search/page.tsx` | Find athletes open to NIL |
| `/brand/offers` | `app/brand/offers/page.tsx` | Track sent offers and deal status |

### Inbox
| Route | File | Description |
|---|---|---|
| `/inbox` | `app/inbox/page.tsx` | General inbox |
| `/athlete/inbox` | `app/athlete/inbox/page.tsx` | Athlete-specific offers inbox |

## Key Features

### Follow / Connection System
- One-way follow: `iFollow` or `theyFollow`
- Mutual follow = "Connected"
- Endpoints: `POST /api/users/:id/follow`, `DELETE /api/users/:id/follow`
- `GET /api/users/:id/followers` and `/following`

### User Search
- `GET /api/users/search?q=...`
- Searches athlete name, coach name, brand name, email
- Returns `connected`, `iFollow`, `theyFollow` flags
- Used in compose modal

### NIL Offers
- Brand sends structured offer: deliverables, dates, compensation
- Athlete accepts/declines from inbox
- Accepted offer creates a Deal record
- Brand tracks in `/brand/offers`

### Recruiting Lists
- Coaches save athletes to named lists
- `POST /api/users/:id/save` / `DELETE /api/users/:id/save`

### File Uploads
- `POST /api/uploads` — multer, saves to `backend/uploads/`
- Used for profile pictures and post media

## Data Model Summary

Key Prisma models in `backend/prisma/schema.prisma`:

| Model | Description |
|---|---|
| `User` | Auth record — email, password (hashed), role (ATHLETE/COACH/BRAND/FAN) |
| `AthleteProfile` | Sport, position, school, stats, NIL flags, recruiting fields |
| `CoachProfile` | Name, org, sport, level |
| `BrandProfile` | Name, type, sports interest |
| `Post` | Social feed post — text, media URL, type |
| `Follow` | followerId → followingId |
| `Message` | DM — senderId, receiverId, subject, body |
| `Offer` | NIL offer — brandId, athleteId, compensation, dates, status |
| `Deal` | Active NIL deal (created when offer accepted) |
| `Save` | Coach saves an athlete to a list |
