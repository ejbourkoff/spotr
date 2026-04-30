# SPOTR

Sports social platform connecting athletes, coaches, brands, and fans.

**Live:** https://tranquil-exploration-production.up.railway.app
**Repo:** https://github.com/ejbourkoff/spotr

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Node.js, Express, Prisma |
| Database | PostgreSQL |
| Hosting | Railway (frontend + backend + Postgres) |

## Docs

| Doc | Contents |
|---|---|
| [docs/FEATURES.md](docs/FEATURES.md) | All pages, roles, and features |
| [docs/API.md](docs/API.md) | Full API endpoint reference |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Brand colors, fonts, component patterns |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Railway setup, env vars, deploy flow |

## Local Development

```bash
# Backend (port 3001)
cd backend && npm install && npm run dev

# Frontend (port 3000)
cd frontend && npm install && npm run dev
```

Frontend needs `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Deploy

Push to `main` — Railway auto-deploys both services.

```bash
git add -A && git commit -m "your message" && git push
```
