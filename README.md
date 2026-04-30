# SPOTR - Professional Network for Student-Athletes

SPOTR is a professional social network for student-athletes, combining LinkedIn-style professional networking with sports-specific features like NIL (Name, Image, Likeness) opportunities and recruiting tools.

## Features

### Social Media Platform
- **Posts**: Create text posts with optional media
- **Feed**: Personalized feed showing posts from users you follow
- **Likes**: Like/unlike posts
- **Comments**: Comment on posts
- **Follows**: Follow/unfollow other users

### Athlete Features
- Create and manage detailed profiles (stats, highlights, bio)
- Toggle status badges ("Open to NIL", "Open to Semi-Pro/Pro")
- View and respond to NIL offers
- Post updates and highlights

### Coach Features
- Search and discover athletes with advanced filters
- Save athletes to lists
- Follow athletes to see their posts
- View detailed athlete profiles

### Brand Features
- Search for athletes open to NIL opportunities
- Send structured NIL offers
- Track offer status and deals
- Manage campaign lists

## Project Structure

```
.
├── backend/          # Node.js + Express + Prisma backend
│   ├── prisma/       # Database schema
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── middleware/ # Auth middleware
│   │   └── server.ts # Express server
│   └── package.json
├── frontend/         # Next.js + TypeScript frontend
│   ├── app/          # Next.js App Router pages
│   ├── lib/          # API client and utilities
│   └── package.json
└── ARCHITECTURE.md   # Architecture documentation
```

## Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
```

4. Set up database:
```bash
# Generate Prisma client
npm run db:generate

# Run migrations (or push schema for development)
npm run db:migrate
# OR
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

The API will run on http://localhost:3001

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file (optional):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. Start development server:
```bash
npm run dev
```

The app will run on http://localhost:3000

## Technology Stack

### Backend
- **Node.js** + **Express** - REST API server
- **PostgreSQL** - Database
- **Prisma** - ORM
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React** - UI library

## Key Entities

- **User** - Base authentication entity with roles (ATHLETE, COACH, BRAND)
- **AthleteProfile** - Athlete information and stats
- **CoachProfile** - Coach information
- **BrandProfile** - Brand information
- **Post** - Social media posts
- **Like** - Post likes
- **Comment** - Post comments
- **Follow** - User follow relationships
- **Offer** - NIL offers from brands to athletes
- **Deal** - Accepted offers (deals)
- **SavedList** - Lists of athletes saved by coaches/brands
- **StatLine** - Athlete statistics
- **Highlight** - Athlete highlight videos/clips

## API Documentation

See `backend/README.md` for detailed API endpoint documentation.

## Development Notes

- Authentication uses JWT tokens stored in localStorage (frontend)
- All code is in your repository and fully owned by you
- Backend and frontend are separate services that can be deployed independently
- Database migrations are handled by Prisma
- Social media features include basic rate limiting TODOs for production

## Next Steps

- Add file upload functionality for highlights and post media
- Implement proper media storage (S3, Cloudinary, etc.)
- Add rate limiting for API endpoints
- Add pagination for feed and search results
- Implement messaging between users
- Add notifications
- Enhance search with more filters and sorting
- Add analytics and reporting

## License

This codebase is fully yours to use and modify as needed.
