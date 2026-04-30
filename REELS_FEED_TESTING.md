# Reels + Feed - Testing Guide

## ✅ What's Implemented

### Backend
1. **Reels API** - `GET /api/posts/reels` - Returns vertical short-form videos
2. **Enhanced Feed API** - `GET /api/posts/feed` - Returns posts (excludes reels)
3. **Save API** - Save/unsave posts and reels
4. **Media Post Creation** - Create posts with photos/videos/reels

### Frontend
1. **Reels Page** (`/reels`) - Full-screen vertical video feed with swipe navigation
2. **Enhanced Feed Page** (`/feed`) - Media posts (photos/videos) with like/comment/save
3. **Navigation** - Feed and Reels links for all user types

## 🧪 How to Test

### 1. Create a Reel (Short Vertical Video)

**Via Frontend:**
- Go to `/feed`
- Click "Create Post"
- Enter text (optional for reels)
- Add video URL (e.g., `https://example.com/video.mp4`)
- Select "Video" as media type
- **Note:** To create a reel, you'll need to use the API directly for now (or I can add a "Create Reel" button)

**Via API (for testing):**
```bash
POST http://localhost:3001/api/posts
Headers: Authorization: Bearer <your-token>
Body:
{
  "text": "Check out my highlight reel!",
  "mediaUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "mediaType": "video",
  "isReel": true
}
```

### 2. Create a Regular Post with Photo

**Via Frontend:**
- Go to `/feed`
- Click "Create Post"
- Enter text
- Add image URL (e.g., `https://picsum.photos/800/600`)
- Select "Photo" as media type
- Click "Post"

### 3. View Reels

- Navigate to `/reels` in the app
- You should see vertical video feed
- **Swipe up/down** (or scroll with mouse wheel) to navigate between reels
- Click like, comment, or save buttons
- Videos should auto-play when in view

### 4. View Feed

- Navigate to `/feed`
- You should see posts with photos/videos
- Videos have play controls
- Photos display as images
- Like, comment, and save buttons work

### 5. Test Save/Bookmark

- On any post or reel, click the save button (📌)
- It should turn yellow (🔖) when saved
- Your saved posts are available via `GET /api/saved`

## 🎯 Features Working for All User Types

✅ **Athletes, Coaches, and Brands can all:**
- View feed (posts from people they follow)
- View reels (vertical video feed)
- Create posts with photos/videos
- Create reels (short vertical videos)
- Like posts/reels
- Comment on posts/reels
- Save/bookmark posts/reels

## 📝 Quick Test Checklist

- [ ] Create a reel via API
- [ ] View reels page - see vertical video feed
- [ ] Swipe between reels (mouse wheel or touch)
- [ ] Like a reel
- [ ] Comment on a reel
- [ ] Save a reel
- [ ] Create a post with photo via frontend
- [ ] View feed - see photo post
- [ ] Create a post with video via frontend
- [ ] View feed - see video post with player
- [ ] Like, comment, save on feed posts

## 🔧 Current Limitations (TODOs)

- File upload not implemented (using URLs for now)
- Reel creation UI not in frontend (use API for now)
- No recommended content algorithm (shows all reels)
- No pagination (shows first 20-50 items)

## 🚀 Next Steps

Once you've tested the Reels + Feed functionality, we can:
1. Add "Create Reel" button to frontend
2. Add file upload support
3. Enhance discover integration
4. Add recommended content algorithm
