# SPOTR Backend

Node.js + Express + Prisma + PostgreSQL backend for SPOTR - a professional social network for student-athletes.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
```

3. Set up database:
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (for development)
npm run db:push
```

4. Start development server:
```bash
npm run dev
```

The API will run on http://localhost:3001

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (authenticated)

### Athletes
- `GET /api/athletes` - Search athletes (with filters)
- `GET /api/athletes/:id` - Get athlete profile
- `GET /api/athletes/profile/me` - Get own profile (athlete only)
- `POST /api/athletes/profile` - Create/update profile (athlete only)
- `POST /api/athletes/profile/stats` - Add stat line (athlete only)
- `POST /api/athletes/profile/highlights` - Add highlight (athlete only)

### Posts (Social Media)
- `GET /api/posts/feed` - Get home feed (authenticated users only)
- `GET /api/posts/user/:userId` - Get posts by a user
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (authenticated)
- `DELETE /api/posts/:id` - Delete own post

### Likes
- `POST /api/posts/:postId/like` - Like a post (authenticated)
- `DELETE /api/posts/:postId/like` - Unlike a post (authenticated)
- `GET /api/posts/:postId/likes` - Get likes for a post

### Comments
- `POST /api/posts/:postId/comments` - Add comment (authenticated)
- `GET /api/posts/:postId/comments` - Get comments for a post

### Follows
- `POST /api/users/:userId/follow` - Follow a user (authenticated)
- `DELETE /api/users/:userId/follow` - Unfollow a user (authenticated)
- `GET /api/users/:userId/followers` - Get followers
- `GET /api/users/:userId/following` - Get following
- `GET /api/users/:userId/follow-status` - Check if following (authenticated)

### Coaches
- `POST /api/coaches/profile` - Create/update profile (coach only)
- `GET /api/coaches/lists` - Get saved lists (coach only)
- `POST /api/coaches/lists` - Create list (coach only)
- `POST /api/coaches/lists/:listId/athletes` - Add athlete to list (coach only)

### Brands
- `POST /api/brands/profile` - Create/update profile (brand only)
- `GET /api/brands/lists` - Get saved lists (brand only)
- `POST /api/brands/lists` - Create list (brand only)
- `POST /api/brands/lists/:listId/athletes` - Add athlete to list (brand only)
- `GET /api/brands/offers` - Get sent offers (brand only)

### Offers
- `GET /api/offers` - Get received offers (athlete only) or sent offers (brand only)
- `GET /api/offers/:id` - Get offer details
- `POST /api/offers` - Create offer (brand only)
- `PUT /api/offers/:id/accept` - Accept offer (athlete only)
- `PUT /api/offers/:id/decline` - Decline offer (athlete only)

### Deals
- `GET /api/deals` - Get deals (athlete or brand)
- `PUT /api/deals/:id/complete` - Mark deal as completed

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

Tokens are returned from `/api/auth/signup` and `/api/auth/login`.

## Social Media Features

The backend includes full social media functionality:
- **Posts**: Users can create posts with text and optional media
- **Feed**: Personalized feed showing posts from users you follow
- **Likes**: Users can like/unlike posts
- **Comments**: Users can comment on posts
- **Follows**: Users can follow/unfollow other users
