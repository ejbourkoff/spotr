import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

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

    // Get users that the current user follows
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = follows.map((f) => f.followingId);
    followingIds.push(userId);

    // If user follows no one, show all posts (discovery mode for new users)
    const feedFilter = followingIds.length > 1
      ? { authorId: { in: followingIds } }
      : {}

    const posts = await prisma.post.findMany({
      where: feedFilter,
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
      take: 50, // TODO: Add pagination
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
    const { text, mediaUrl, mediaType, isReel, thumbnailUrl, muxUploadId } = req.body;

    if (isReel) {
      if (!muxUploadId && !mediaUrl) {
        return res.status(400).json({ error: 'Reels require a video upload' });
      }
    } else {
      if ((!text || text.trim().length === 0) && !mediaUrl) {
        return res.status(400).json({ error: 'Post text or media is required' });
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        text: (text || '').trim(),
        mediaUrl: mediaUrl || null,
        mediaType: isReel ? 'video' : (mediaType || (mediaUrl ? 'photo' : null)),
        isReel: isReel || false,
        thumbnailUrl: thumbnailUrl || null,
        muxUploadId: muxUploadId || null,
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
