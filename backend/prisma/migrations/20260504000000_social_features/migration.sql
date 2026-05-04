-- Add bioLink and bio to profiles
ALTER TABLE "athlete_profiles" ADD COLUMN IF NOT EXISTS "bioLink" TEXT;
ALTER TABLE "coach_profiles" ADD COLUMN IF NOT EXISTS "bioLink" TEXT;
ALTER TABLE "coach_profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "bioLink" TEXT;
ALTER TABLE "brand_profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- Add highlightGroup to posts
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "highlightGroup" TEXT;

-- Add type and sharedPostId to messages
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sharedPostId" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL DEFAULT '';

-- Fix subject nullable
UPDATE "messages" SET "subject" = '' WHERE "subject" IS NULL;

-- sharedPost FK
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_sharedPostId_fkey'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_sharedPostId_fkey"
      FOREIGN KEY ("sharedPostId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "messages_senderId_receiverId_idx" ON "messages"("senderId", "receiverId");

-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "postId" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_actorId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_postId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_postId_fkey"
      FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- Story views table
CREATE TABLE IF NOT EXISTS "story_views" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "story_views_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'story_views_storyId_fkey') THEN
    ALTER TABLE "story_views" ADD CONSTRAINT "story_views_storyId_fkey"
      FOREIGN KEY ("storyId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'story_views_viewerId_fkey') THEN
    ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewerId_fkey"
      FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'story_views_storyId_viewerId_key') THEN
    ALTER TABLE "story_views" ADD CONSTRAINT "story_views_storyId_viewerId_key" UNIQUE ("storyId", "viewerId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "story_views_storyId_idx" ON "story_views"("storyId");

-- Profile views table
CREATE TABLE IF NOT EXISTS "profile_views" (
  "id" TEXT NOT NULL,
  "profileUserId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_views_profileUserId_fkey') THEN
    ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profileUserId_fkey"
      FOREIGN KEY ("profileUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_views_viewerId_fkey') THEN
    ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewerId_fkey"
      FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "profile_views_profileUserId_idx" ON "profile_views"("profileUserId");
