# SPOTR — API Reference

Base URL (production): `https://spotr-production.up.railway.app/api`
Base URL (local): `http://localhost:3001/api`

All protected routes require: `Authorization: Bearer <token>`

---

## Auth

### POST `/auth/signup`
Create a new account.
```json
{ "email": "...", "password": "...", "role": "ATHLETE|COACH|BRAND|FAN" }
```
Returns: `{ user, token }`

### POST `/auth/login`
```json
{ "email": "...", "password": "..." }
```
Returns: `{ user, token }`

### GET `/auth/me` 🔒
Returns: `{ user }` — current logged-in user

---

## Athletes

### GET `/athletes` 🔒
Search/filter athletes.
Query params: `sport`, `position`, `school`, `level`, `openToNIL`, `openToSemiProPro`, `search`, `page`, `limit`

### GET `/athletes/:id` 🔒
Get athlete profile by user ID.

### GET `/athletes/profile/me` 🔒
Get own athlete profile.

### PUT `/athletes/profile` 🔒
Update own athlete profile.
```json
{ "name": "...", "sport": "...", "position": "...", "schoolTeam": "...", "classYear": "...", "bio": "...", "openToNIL": true, "openToSemiProPro": false }
```

### POST `/athletes/profile/stats` 🔒
Add a stat line.

### POST `/athletes/profile/highlights` 🔒
Add a highlight link.

---

## Posts

### GET `/posts/feed` 🔒
Get social feed posts.

### GET `/posts/reels` 🔒
Get reels feed. Query: `page`, `limit`

### GET `/posts/user/:userId` 🔒
Posts by a specific user.

### POST `/posts` 🔒
Create a post.
```json
{ "content": "...", "mediaUrl": "...", "mediaType": "image|video" }
```

### DELETE `/posts/:id` 🔒
Delete own post.

### POST `/posts/:id/like` 🔒
Like a post.

### DELETE `/posts/:id/like` 🔒
Unlike a post.

### GET `/posts/:id/comments` 🔒
Get comments on a post.

### POST `/posts/:id/comments` 🔒
Add a comment.
```json
{ "content": "..." }
```

### POST `/posts/:postId/save` 🔒
Save a post.

### DELETE `/posts/:postId/save` 🔒
Unsave a post.

### GET `/saved` 🔒
Get all saved posts.

---

## Users / Follows

### GET `/users/search?q=...` 🔒
Search all users by name or email. Returns up to 20 results with `connected`, `iFollow`, `theyFollow` flags.

### POST `/users/:id/follow` 🔒
Follow a user.

### DELETE `/users/:id/follow` 🔒
Unfollow a user.

### GET `/users/:id/followers` 🔒
Get followers list.

### GET `/users/:id/following` 🔒
Get following list.

---

## Messages

### GET `/messages` 🔒
Get all message threads for current user.

### POST `/messages` 🔒
Send a message.
```json
{ "receiverId": "...", "subject": "...", "body": "..." }
```
Also accepts `receiverEmail` (legacy fallback).

### GET `/messages/:threadId` 🔒
Get messages in a thread.

---

## Offers (NIL)

### GET `/offers` 🔒
Get offers (brands see sent, athletes see received).

### POST `/offers` 🔒
Brand creates an offer.
```json
{
  "athleteId": "...",
  "deliverables": "...",
  "campaignStartDate": "2026-06-01",
  "campaignEndDate": "2026-06-30",
  "compensationAmount": 500,
  "notes": "..."
}
```

### POST `/offers/:id/accept` 🔒
Athlete accepts an offer. Creates a Deal.

### POST `/offers/:id/decline` 🔒
Athlete declines an offer.

---

## Deals

### GET `/deals` 🔒
Get active deals for current user.

### PUT `/deals/:id` 🔒
Update deal status.

---

## Coaches

### GET `/coaches/profile/me` 🔒
Get own coach profile.

### PUT `/coaches/profile` 🔒
Update coach profile.

### GET `/coaches/lists` 🔒
Get recruiting lists.

### POST `/coaches/lists` 🔒
Create a recruiting list.

---

## Brands

### GET `/brands/profile/me` 🔒
Get own brand profile.

### PUT `/brands/profile` 🔒
Update brand profile.

---

## Saves (Recruiting Lists)

### POST `/users/:id/save` 🔒
Coach saves an athlete.

### DELETE `/users/:id/save` 🔒
Remove from saved.

---

## Uploads

### POST `/uploads` 🔒
Upload a file (multipart/form-data, field: `file`).
Returns: `{ url: "/uploads/filename.jpg" }`

---

## Public

### GET `/public/athletes/:slug`
Public athlete profile (no auth required).

---

## Health

### GET `/health`
Returns: `{ status: "ok", message: "SPOTR API is running" }`
