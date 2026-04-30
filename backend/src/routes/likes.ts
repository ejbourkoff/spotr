import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Like a post
router.post('/:postId/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      return res.status(400).json({ error: 'Post already liked' });
    }

    const like = await prisma.like.create({
      data: {
        userId,
        postId,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    res.status(201).json({ like });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Post already liked' });
    }
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlike a post
router.delete('/:postId/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;

    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (!like) {
      return res.status(404).json({ error: 'Like not found' });
    }

    await prisma.like.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get likes for a post
router.get('/:postId/likes', async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;

    const likes = await prisma.like.findMany({
      where: { postId },
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
      orderBy: { createdAt: 'desc' },
    });

    res.json({ likes, count: likes.length });
  } catch (error) {
    console.error('Get likes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
