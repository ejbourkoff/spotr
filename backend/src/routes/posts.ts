import express, { Response } from 'express';
import Mux from '@mux/mux-node';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const router = express.Router();

// Get reels feed (vertical short-form videos)
router.get('/reels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = '20', offset = '0' } = req.query;

    // Get reels (posts with isReel = true)
    // For now, show all reels. Later can filter by following + recommended
    const reels = await prisma.post.findMany({
      where: {
        isReel: true,
      },
      include: {
        author: {
          include: {
            athleteProfile: {
              select: {
                id: true,
                name: true,
                sport: true,
              },
            },
            coachProfile: {
              select: {
                id: true,
                name: true,
                organization: true,
              },
            },
            brandProfile: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              include: {
                athleteProfile: {
                  select: { name: true },
                },
                coachProfile: {
                  select: { name: true },
                },
                brandProfile: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 5, // Show first 5 comments
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Check which reels the current user has liked and saved
    const userLikedPostIds = await prisma.like.findMany({
      where: {
        userId,
        postId: {
          in: reels.map((r) => r.id),
        },
      },
      select: { postId: true },
    });

    const userSavedPostIds = await prisma.save.findMany({
      where: {
        userId,
        postId: {
          in: reels.map((r) => r.id),
        },
      },
      select: { postId: true },
    });

    const likedPostIds = new Set(userLikedPostIds.map((l) => l.postId));
    const savedPostIds = new Set(userSavedPostIds.map((s) => s.postId));

    const reelsWithStatus = reels.map((reel) => ({
      ...reel,
      isLiked: likedPostIds.has(reel.id),
      isSaved: savedPostIds.has(reel.id),
    }));

    res.json({ reels: reelsWithStatus, total: reels.length });
  } catch (error) {
    console.error('Get reels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get home feed (posts from users the current user follows)
router.get('/feed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = '20', offset = '0' } = req.query;
    const take = parseInt(limit as string) || 20;
    const skip = parseInt(offset as string) || 0;

    // Get users that the current user follows
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = follows.map((f) => f.followingId);
    followingIds.push(userId);

    // Always include own posts; when following nobody show everyone (discovery)
    const authorFilter = followingIds.length > 1
      ? { authorId: { in: followingIds } }
      : {}

    const posts = await prisma.post.findMany({
      where: { ...authorFilter, isStory: false, isReel: false },
      include: {
        author: {
          include: {
            athleteProfile: {
              select: {
                id: true,
                name: true,
                sport: true,
              },
            },
            coachProfile: {
              select: {
                id: true,
                name: true,
                organization: true,
              },
            },
            brandProfile: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              include: {
                athleteProfile: {
                  select: { name: true },
                },
                coachProfile: {
                  select: { name: true },
                },
                brandProfile: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    // Check which posts the current user has liked and saved
    const userLikedPostIds = await prisma.like.findMany({
      where: {
        userId,
        postId: {
          in: posts.map((p) => p.id),
        },
      },
      select: { postId: true },
    });

    const userSavedPostIds = await prisma.save.findMany({
      where: {
        userId,
        postId: {
          in: posts.map((p) => p.id),
        },
      },
      select: { postId: true },
    });

    const likedPostIds = new Set(userLikedPostIds.map((l) => l.postId));
    const savedPostIds = new Set(userSavedPostIds.map((s) => s.postId));

    const postsWithStatus = posts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
      isSaved: savedPostIds.has(post.id),
    }));

    res.json({ posts: postsWithStatus });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get posts by a specific user
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      include: {
        author: {
          include: {
            athleteProfile: {
              select: {
                id: true,
                name: true,
                sport: true,
              },
            },
            coachProfile: {
              select: {
                id: true,
                name: true,
                organization: true,
              },
            },
            brandProfile: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              include: {
                athleteProfile: {
                  select: { name: true },
                },
                coachProfile: {
                  select: { name: true },
                },
                brandProfile: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check if current user has liked and saved these posts
    const currentUserId = req.userId;
    let likedPostIds = new Set<string>();
    let savedPostIds = new Set<string>();
    if (currentUserId) {
      const userLikes = await prisma.like.findMany({
        where: {
          userId: currentUserId,
          postId: {
            in: posts.map((p) => p.id),
          },
        },
        select: { postId: true },
      });
      likedPostIds = new Set(userLikes.map((l) => l.postId));

      const userSaves = await prisma.save.findMany({
        where: {
          userId: currentUserId,
          postId: {
            in: posts.map((p) => p.id),
          },
        },
        select: { postId: true },
      });
      savedPostIds = new Set(userSaves.map((s) => s.postId));
    }

    const postsWithStatus = posts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
      isSaved: savedPostIds.has(post.id),
    }));

    res.json({ posts: postsWithStatus });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's own posts — MUST be before /:id
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      include: {
        author: {
          include: {
            athleteProfile: { select: { id: true, name: true, sport: true } },
            coachProfile:   { select: { id: true, name: true, organization: true } },
            brandProfile:   { select: { id: true, name: true, organizationType: true } },
          },
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const likedPostIds = new Set(
      (await prisma.like.findMany({ where: { userId, postId: { in: posts.map(p => p.id) } }, select: { postId: true } }))
        .map(l => l.postId)
    );
    const savedPostIds = new Set(
      (await prisma.save.findMany({ where: { userId, postId: { in: posts.map(p => p.id) } }, select: { postId: true } }))
        .map(s => s.postId)
    );

    res.json({
      posts: posts.map(p => ({ ...p, isLiked: likedPostIds.has(p.id), isSaved: savedPostIds.has(p.id) })),
    });
  } catch (error) {
    console.error('Get my posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stories — MUST be before /:id or Express matches 'stories' as an id
router.get('/stories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    // Get IDs of people current user follows (+ self)
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const feedUserIds = [...follows.map(f => f.followingId), userId];

    const stories = await prisma.post.findMany({
      where: {
        isStory: true,
        storyExpiresAt: { gt: now },
        authorId: { in: feedUserIds },
      },
      include: {
        author: {
          include: {
            athleteProfile: { select: { id: true, name: true, sport: true } },
            coachProfile:   { select: { id: true, name: true, organization: true } },
            brandProfile:   { select: { id: true, name: true, organizationType: true } },
          },
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const likedIds = new Set(
      (await prisma.like.findMany({
        where: { userId, postId: { in: stories.map(s => s.id) } },
        select: { postId: true },
      })).map(l => l.postId)
    );
    const savedIds = new Set(
      (await prisma.save.findMany({
        where: { userId, postId: { in: stories.map(s => s.id) } },
        select: { postId: true },
      })).map(s => s.postId)
    );

    // iOS decodes PostsResponse { posts } — use "posts" key
    res.json({
      posts: stories.map(s => ({ ...s, isLiked: likedIds.has(s.id), isSaved: savedIds.has(s.id) })),
    });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trending posts — top engagement in last 7 days
router.get('/trending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = '20' } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const posts = await prisma.post.findMany({
      where: { isStory: false, isReel: false, createdAt: { gte: sevenDaysAgo } },
      include: {
        author: {
          include: {
            athleteProfile: { select: { id: true, name: true, sport: true } },
            coachProfile:   { select: { id: true, name: true, organization: true } },
            brandProfile:   { select: { id: true, name: true, organizationType: true } },
          },
        },
        comments: {
          include: {
            user: {
              include: {
                athleteProfile: { select: { name: true } },
                coachProfile:   { select: { name: true } },
                brandProfile:   { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
      orderBy: { likes: { _count: 'desc' } },
      take: parseInt(limit as string) || 20,
    });

    const userLikedPostIds = await prisma.like.findMany({
      where: { userId, postId: { in: posts.map((p) => p.id) } },
      select: { postId: true },
    });
    const userSavedPostIds = await prisma.save.findMany({
      where: { userId, postId: { in: posts.map((p) => p.id) } },
      select: { postId: true },
    });

    const likedSet = new Set(userLikedPostIds.map((l) => l.postId));
    const savedSet = new Set(userSavedPostIds.map((s) => s.postId));

    const postsWithStatus = posts.map((p) => ({
      ...p,
      isLiked: likedSet.has(p.id),
      isSaved: savedSet.has(p.id),
    }));

    res.json({ posts: postsWithStatus });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record a story view — POST /api/posts/:postId/view
router.post('/:postId/view', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const viewerId = req.userId!;

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { isStory: true, authorId: true } });
    if (!post || !post.isStory) return res.status(404).json({ error: 'Story not found' });
    if (post.authorId === viewerId) return res.json({ ok: true }); // Don't count author's own view

    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: postId, viewerId } },
      create: { storyId: postId, viewerId },
      update: {},
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get story viewers — GET /api/posts/:postId/story-views (author only)
router.get('/:postId/story-views', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const views = await prisma.storyView.findMany({
      where: { storyId: postId },
      include: {
        viewer: {
          select: {
            id: true,
            avatarUrl: true,
            athleteProfile: { select: { name: true } },
            coachProfile:   { select: { name: true } },
            brandProfile:   { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ views, count: views.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single post
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          include: {
            athleteProfile: {
              select: {
                id: true,
                name: true,
                sport: true,
              },
            },
            coachProfile: {
              select: {
                id: true,
                name: true,
                organization: true,
              },
            },
            brandProfile: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              include: {
                athleteProfile: {
                  select: { name: true },
                },
                coachProfile: {
                  select: { name: true },
                },
                brandProfile: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let isLiked = false;
    let isSaved = false;
    if (currentUserId) {
      const like = await prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: currentUserId,
            postId: id,
          },
        },
      });
      isLiked = !!like;

      const save = await prisma.save.findUnique({
        where: {
          userId_postId: {
            userId: currentUserId,
            postId: id,
          },
        },
      });
      isSaved = !!save;
    }

    res.json({ post: { ...post, isLiked, isSaved } });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { text, mediaUrl, mediaType, isReel, isHighlight, isStory, thumbnailUrl, muxUploadId } = req.body;

    if (isReel) {
      if (!muxUploadId && !mediaUrl) {
        return res.status(400).json({ error: 'Reels require a video upload' });
      }
    } else {
      if ((!text || text.trim().length === 0) && !mediaUrl) {
        return res.status(400).json({ error: 'Post text or media is required' });
      }
    }

    // If a muxUploadId is provided, check if the asset is already ready (race condition:
    // Mux webhook can fire before the post is created)
    let resolvedMuxAssetId: string | null = null;
    let resolvedMuxPlaybackId: string | null = null;
    let resolvedMediaUrl: string | null = mediaUrl || null;
    let resolvedThumbnailUrl: string | null = thumbnailUrl || null;

    if (muxUploadId) {
      try {
        const upload = await mux.video.uploads.retrieve(muxUploadId);
        if (upload.asset_id) {
          const asset = await mux.video.assets.retrieve(upload.asset_id);
          if (asset.status === 'ready' && asset.playback_ids?.[0]?.id) {
            resolvedMuxAssetId = asset.id;
            resolvedMuxPlaybackId = asset.playback_ids[0].id;
            resolvedMediaUrl = `https://stream.mux.com/${resolvedMuxPlaybackId}.m3u8`;
            resolvedThumbnailUrl = `https://image.mux.com/${resolvedMuxPlaybackId}/thumbnail.jpg`;
          }
        }
      } catch {
        // Non-fatal: webhook will backfill if asset isn't ready yet
      }
    }

    const storyExpiresAt = isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        text: (text || '').trim(),
        mediaUrl: resolvedMediaUrl,
        mediaType: isReel ? 'video' : (mediaType || (mediaUrl ? 'photo' : null)),
        isReel: isReel || false,
        isHighlight: isHighlight || false,
        isStory: isStory || false,
        ...(storyExpiresAt ? { storyExpiresAt } : {}),
        thumbnailUrl: resolvedThumbnailUrl,
        muxUploadId: muxUploadId || null,
        muxAssetId: resolvedMuxAssetId,
        muxPlaybackId: resolvedMuxPlaybackId,
      },
      include: {
        author: {
          include: {
            athleteProfile: {
              select: {
                id: true,
                name: true,
                sport: true,
              },
            },
            coachProfile: {
              select: {
                id: true,
                name: true,
                organization: true,
              },
            },
            brandProfile: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true,
          },
        },
      },
    });

    res.status(201).json({ post: { ...post, isLiked: false, isSaved: false, likes: [], comments: [] } });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post (own posts only)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await prisma.post.delete({
      where: { id },
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
