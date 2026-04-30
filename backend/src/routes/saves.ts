import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Save/bookmark a post
router.post('/posts/:postId/save', authenticate, async (req: AuthRequest, res: Response) => {
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

    // Check if already saved
    const existingSave = await prisma.save.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingSave) {
      return res.status(400).json({ error: 'Post already saved' });
    }

    const save = await prisma.save.create({
      data: {
        userId,
        postId,
      },
      include: {
        post: {
          select: {
            id: true,
            text: true,
            mediaUrl: true,
          },
        },
      },
    });

    res.status(201).json({ save });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Post already saved' });
    }
    console.error('Save post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unsave a post
router.delete('/posts/:postId/save', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;

    const save = await prisma.save.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (!save) {
      return res.status(404).json({ error: 'Save not found' });
    }

    await prisma.save.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    res.json({ message: 'Post unsaved successfully' });
  } catch (error) {
    console.error('Unsave post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get saved posts for current user
router.get('/saved', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const saves = await prisma.save.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              include: {
                athleteProfile: {
                  select: { name: true, sport: true },
                },
                coachProfile: {
                  select: { name: true, organization: true },
                },
                brandProfile: {
                  select: { name: true, organizationType: true },
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ savedPosts: saves.map((s) => s.post) });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
