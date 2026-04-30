# SPOTR Architecture & Data Model

## Stack

**Backend:**
- Node.js + Express
- PostgreSQL database
- Prisma ORM
- JWT for authentication
- bcrypt for password hashing

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- React
- Tailwind CSS for styling

## Core Entities

### User
- Base authentication entity
- email, password (hashed), role (athlete | coach | brand)
- createdAt, updatedAt

### AthleteProfile
- Linked to User (one-to-one)
- Basic info: name, sport, position, school/team, classYear, location, height, weight, bio
- Status flags: openToNIL, openToSemiProPro
- Stats: relationship to StatLine (one-to-many)
- Highlights: relationship to Highlight (one-to-many)
- Posts: relationship to Post (one-to-many)

### CoachProfile
- Linked to User (one-to-one)
- Basic info: name, organization/team, title, location

### BrandProfile
- Linked to User (one-to-one)
- Basic info: name, organization type, location

### StatLine
- Linked to AthleteProfile
- season, statType (e.g., "PPG", "APG"), value
- Flexible design to support multiple sports

### Highlight
- Linked to AthleteProfile
- url (or file path), title, description, tags, opponent, gameDate, season

### Post (Social Media)
- Linked to User (author)
- text content, mediaUrl (optional), createdAt
- Relationships: likes (one-to-many), comments (one-to-many)

### Like
- Linked to User and Post
- createdAt
- Unique constraint on (userId, postId)

### Comment
- Linked to User and Post
- text content, createdAt

### Follow
- Social graph: followerId, followingId
- createdAt
- Unique constraint on (followerId, followingId)

### Offer
- Created by Brand → sent to Athlete
- Fields: deliverables (text), campaignStartDate, campaignEndDate, compensationAmount, notes, status (pending | accepted | declined)
- Relationships: brandId, athleteId

### Deal
- Created when Offer is accepted
- Linked to Offer (one-to-one)
- Fields: status (active | completed), completedAt
- Inherits details from Offer

### SavedList
- Lists of athletes saved by coaches or brands
- Fields: name, type (coach | brand)
- Many-to-many relationship with AthleteProfile via SavedListEntry

### SavedListEntry
- Join table for SavedList and AthleteProfile
- Fields: listId, athleteId, createdAt

### Message
- Simple messaging between users
- Fields: senderId, receiverId, subject, body, readAt, createdAt

## API Endpoints

### Auth
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/me

### Athletes
- GET /api/athletes (search with filters)
- GET /api/athletes/:id
- POST /api/athletes/profile
- PUT /api/athletes/profile
- POST /api/athletes/profile/stats
- POST /api/athletes/profile/highlights

### Posts (Social Media)
- GET /api/posts/feed (home feed - posts from followed users)
- GET /api/posts/user/:userId (posts by a specific user)
- POST /api/posts (create post)
- GET /api/posts/:id (get single post with likes/comments)
- DELETE /api/posts/:id (delete own post)

### Likes
- POST /api/posts/:postId/like (like a post)
- DELETE /api/posts/:postId/like (unlike a post)
- GET /api/posts/:postId/likes (get likes for a post)

### Comments
- POST /api/posts/:postId/comments (add comment)
- GET /api/posts/:postId/comments (get comments for a post)
- DELETE /api/comments/:id (delete own comment)

### Follows
- POST /api/users/:userId/follow (follow a user)
- DELETE /api/users/:userId/follow (unfollow a user)
- GET /api/users/:userId/followers (get followers)
- GET /api/users/:userId/following (get following)

### Coaches
- POST /api/coaches/profile
- PUT /api/coaches/profile
- GET /api/coaches/lists
- POST /api/coaches/lists
- POST /api/coaches/lists/:id/athletes

### Brands
- POST /api/brands/profile
- PUT /api/brands/profile
- GET /api/brands/lists
- POST /api/brands/lists
- POST /api/brands/lists/:listId/athletes
- GET /api/brands/offers

### Offers
- GET /api/offers (for athletes - their received offers, or brands - sent offers)
- GET /api/offers/:id
- POST /api/offers (brand → athlete)
- PUT /api/offers/:id/accept
- PUT /api/offers/:id/decline

### Deals
- GET /api/deals (for athletes and brands)
- PUT /api/deals/:id/complete

## Frontend Routes

- /auth/login
- /auth/signup
- / (home feed)
- /athlete/profile (edit)
- /athlete/profile/[id] (public view)
- /athlete/inbox (offers)
- /coach/discover
- /coach/lists
- /brand/search
- /brand/lists
- /brand/offers
- /post/create
- /profile/[userId] (generic profile view)
