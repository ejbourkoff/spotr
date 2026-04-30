# SPOTR — Deployment

## Live URLs

| Service | URL |
|---|---|
| Frontend | https://tranquil-exploration-production.up.railway.app |
| Backend API | https://spotr-production.up.railway.app/api |
| GitHub | https://github.com/ejbourkoff/spotr |

## Platform: Railway

Three services in one Railway project (`melodious-laughter / production`):

| Service | Type | Root Dir |
|---|---|---|
| `spotr` | GitHub repo → Node/Express | `backend/` |
| `tranquil-exploration` | GitHub repo → Next.js | `frontend/` |
| `Postgres` | Railway managed database | — |

## Deploy Flow

Every `git push origin main` auto-triggers redeploys on both services.

```bash
# Make changes locally, then:
git add -A
git commit -m "your message"
git push
# Railway picks it up automatically — ~2-3 min build time
```

## Environment Variables

### Backend (`spotr` service)
| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway reference) |
| `JWT_SECRET` | `084ab6fd7ba4f36c5d04e5b9feb774063a36de46900e002bed3392ccf829974e` |
| `NODE_ENV` | `production` |

### Frontend (`tranquil-exploration` service)
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://spotr-production.up.railway.app/api` |

## Build Commands

### Backend (`backend/railway.toml`)
- **Build:** `npm install && npm run build && npx prisma generate`
- **Start:** `npx prisma migrate deploy && npm start`
- **Health check:** `/api/health`

### Frontend (`frontend/railway.toml`)
- **Build:** `npm install && npm run build`
- **Start:** `npm start`
- **Health check:** `/`

## Local Development

```bash
# Terminal 1 — backend
cd backend && npm run dev     # runs on http://localhost:3001

# Terminal 2 — frontend
cd frontend && npm run dev    # runs on http://localhost:3000
```

Frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Backend `.env`:
```
DATABASE_URL=postgresql://...   # local Postgres
JWT_SECRET=any-local-secret
PORT=3001
```

## Database

- **Provider:** Railway managed PostgreSQL
- **ORM:** Prisma
- **Migrations:** Run automatically on deploy via `prisma migrate deploy`
- **Local changes:** Run `npx prisma db push` from `/backend` after schema edits

## Adding New Environment Variables

1. Go to Railway dashboard → service → Variables tab
2. Add variable
3. Railway auto-redeploys

Never commit `.env` or `.env.local` files — they are in `.gitignore`.
