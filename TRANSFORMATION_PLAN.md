# SPOTR Transformation Plan

## Current State vs. Desired State

### Current (Basic MVP):
- ✅ Basic auth
- ✅ Simple text posts
- ✅ Basic profile form
- ✅ Simple list-based discover
- ✅ Basic NIL offers (text only)

### Desired (Full Social Media Platform):
- 🎯 Rich media posts (photos/videos/reels)
- 🎯 Reels-style vertical video feed
- 🎯 Premium profiles (hero, banner, pinned content)
- 🎯 Enhanced Discover (grid, trending, search)
- 🎯 Full NIL experience (posting, applications, messaging)
- 🎯 Modern UI (Instagram/TikTok-style for athletes)

## Implementation Strategy

Due to the scope, I'll implement in this priority order:

### Phase 1: Core Social Features (HIGHEST PRIORITY)
1. **Enhanced Feed** - Media posts (photos/videos), not just text
2. **Reels Page** - Vertical video feed (basic but working)
3. **Enhanced Posts API** - Support media uploads, reels
4. **Save/Bookmark** - Save posts feature

### Phase 2: Premium Profiles (HIGH PRIORITY)
1. **Athlete Profile Redesign** - Hero section, banner, stats layout
2. **Profile Picture & Banner** - Add to schema and UI
3. **Pinned Content** - Show pinned reels/highlights
4. **NIL Deals Display** - Show deals on profile

### Phase 3: Enhanced Discover (MEDIUM PRIORITY)
1. **Discover Grid Layout** - Cards instead of list
2. **Enhanced Search** - Better filters, trending
3. **Trending Section** - Popular athletes/reels

### Phase 4: Enhanced NIL Features (MEDIUM PRIORITY)
1. **NIL Posting Flow** - Brands/coaches post opportunities
2. **Application Flow** - Athletes apply to opportunities
3. **Enhanced Inbox** - Threads, messaging within deals

### Phase 5: Polish & Demo Data (LOW PRIORITY)
1. **Seed Data** - Demo athletes, posts, reels
2. **Onboarding** - Suggested accounts, tour
3. **Animations** - Smooth transitions

## Technical Changes Needed

### Database Schema (DONE ✅)
- ✅ Added `mediaType`, `isReel`, `thumbnailUrl` to Post
- ✅ Added `Save` model for bookmarks
- ⏳ Need to add `profilePictureUrl`, `bannerUrl` to AthleteProfile

### API Routes (TO DO)
- `/api/posts` - Update to handle media uploads
- `/api/posts/reels` - New endpoint for reels feed
- `/api/posts/:id/save` - Save/unsave posts
- `/api/discover` - Enhanced discover with trending
- `/api/discover/search` - Advanced search
- `/api/nil-opportunities` - Post/browse opportunities (beyond just offers)

### Frontend Pages (TO DO)
- `/feed` - Enhanced with media support
- `/reels` - NEW - Vertical video feed
- `/discover` - Redesigned grid layout
- `/athlete/profile/[id]` - Premium profile design
- `/nil-opportunities` - NEW - Browse/post opportunities
- Enhanced navigation with new sections

### Components (TO DO)
- `MediaPostCard` - Post with photo/video
- `ReelPlayer` - Vertical video player
- `ProfileHero` - Hero section with banner
- `DiscoverGrid` - Grid layout for discover
- `NILOpportunityCard` - Opportunity card
- `SaveButton` - Save/bookmark button

## Next Steps

I'll start implementing Phase 1 (Core Social Features) now, focusing on:
1. Updating Posts API to support media
2. Creating Reels page and API
3. Enhancing Feed page to show media
4. Adding Save functionality

This will give you a working foundation to test, then we can continue with the other phases.
