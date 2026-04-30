# SPOTR Implementation Checklist

This document tracks what features are implemented and can be tested.

## ✅ Core Infrastructure (COMPLETE)

- [x] Database schema with media support (photos, videos, reels)
- [x] Authentication system
- [x] Role-based access control (Athlete, Coach, Brand)
- [x] Basic API structure

## 🚧 Features to Implement

### 1. Social Media Core Features

#### Feed & Posts
- [ ] **Enhanced Feed Page** (`/feed`)
  - [ ] Display posts with photos/videos (not just text)
  - [ ] Support for reels (vertical short videos)
  - [ ] Like, comment, save functionality
  - [ ] Filter: Following vs Recommended
  - [ ] Infinite scroll

#### Reels
- [ ] **Reels Page** (`/reels`)
  - [ ] Vertical swipe video feed (endless scroll)
  - [ ] Full-screen video player
  - [ ] Captions, likes, comments overlay
  - [ ] Swipe to next/previous reel
  - [ ] Auto-play with sound toggle

#### Posts API
- [ ] Create post with media (photo/video)
- [ ] Create reel (short vertical video)
- [ ] Get feed (following + recommended)
- [ ] Get reels feed
- [ ] Like/unlike post
- [ ] Save/unsave post
- [ ] Comment on post

### 2. Discover & Search

#### Discover Page (`/discover`)
- [ ] **Grid/List Layout** (not just simple list)
  - [ ] Trending athletes section
  - [ ] Popular reels section
  - [ ] Featured NIL opportunities
  - [ ] Search bar (athletes, coaches, brands)
  - [ ] Filter by: sport, position, school, location, graduation year
  - [ ] Sort by: trending, newest, most popular

#### Search API
- [ ] Enhanced search endpoint with filters
- [ ] Trending athletes endpoint
- [ ] Popular reels endpoint
- [ ] Featured NIL opportunities endpoint

### 3. NIL Features

#### NIL Offers Area (`/nil-offers` or `/brand/offers`)
- [ ] **For Brands/Coaches:**
  - [ ] Post NIL opportunity (campaign, deal, tryout)
  - [ ] View posted opportunities
  - [ ] Track status (sent, viewed, accepted, declined)
  - [ ] Manage applications

- [ ] **For Athletes:**
  - [ ] Browse NIL opportunities
  - [ ] Apply/respond to offers
  - [ ] Track application status
  - [ ] View deal details

#### Inbox (`/inbox`)
- [ ] Deal threads/conversations
  - [ ] Back-and-forth messaging
  - [ ] Offer details in thread
  - [ ] Status updates
  - [ ] File attachments

#### NIL API
- [ ] Create NIL opportunity (brand/coach)
- [ ] List NIL opportunities (with filters)
- [ ] Apply to opportunity (athlete)
- [ ] Update application status
- [ ] Messaging within deal threads

### 4. Premium Profiles

#### Athlete Profile (`/athlete/profile/[id]`)
- [ ] **Hero Section:**
  - [ ] Banner image
  - [ ] Profile picture
  - [ ] Basic info (name, sport, position)

- [ ] **Stats Section:**
  - [ ] Sport, position, height/weight
  - [ ] School, class year, location
  - [ ] Performance stats (PPG, APG, etc.)

- [ ] **Content Sections:**
  - [ ] Pinned reels/highlights
  - [ ] Recent posts grid
  - [ ] NIL deals/brands worked with
  - [ ] Follow button

#### Coach Profile (`/coach/profile/[id]`)
- [ ] Who they've worked with
- [ ] Open offers/opportunities
- [ ] Key info (school, conference, sport)
- [ ] Recent activity

#### Brand Profile (`/brand/profile/[id]`)
- [ ] Athletes they've worked with
- [ ] Open NIL opportunities
- [ ] Brand category, location
- [ ] Recent activity

### 5. Navigation & UX

#### Navigation
- [ ] **Athlete Navigation:**
  - [ ] Feed
  - [ ] Reels
  - [ ] Discover
  - [ ] My Profile
  - [ ] Inbox/NIL

- [ ] **Coach Navigation:**
  - [ ] Feed
  - [ ] Discover Athletes
  - [ ] Reels
  - [ ] My Profile
  - [ ] Offers

- [ ] **Brand Navigation:**
  - [ ] Feed
  - [ ] Reels
  - [ ] NIL Search
  - [ ] My Offers
  - [ ] Inbox

#### Onboarding
- [ ] After signup, redirect to populated feed (not empty profile)
- [ ] Suggested accounts to follow
- [ ] Quick tour/tutorial
- [ ] Profile completion prompts

### 6. UI/Design

#### Modern Sports App Design
- [ ] Card-based layouts (not flat lists)
- [ ] Media-first design (photos/videos prominent)
- [ ] Grid layouts for discover
- [ ] Reels-style vertical video player
- [ ] Smooth animations/transitions
- [ ] Mobile-responsive design

#### Components Needed
- [ ] Media post card component
- [ ] Reel video player component
- [ ] Profile hero component
- [ ] Discover grid component
- [ ] NIL offer card component
- [ ] Inbox thread component

### 7. Demo/Seed Data

- [ ] Seed demo athletes with profiles
- [ ] Seed demo posts (photos, videos, reels)
- [ ] Seed demo NIL opportunities
- [ ] Sample reels content
- [ ] Trending content examples

## Testing Guide

Once features are implemented, test in this order:

1. **Sign Up/Login** → Should redirect to feed (not profile)
2. **Feed** → See posts with media, like/comment/save
3. **Reels** → Swipe through vertical videos
4. **Discover** → Search athletes, see trending content
5. **Profile** → View premium athlete profile layout
6. **NIL Offers** → Create/browse/apply to opportunities
7. **Inbox** → View deal threads and messages
