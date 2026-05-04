import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { commentLimiter } from '../middleware/rateLimiters';

const router = express.Router();

// Add comment to a post
router.post('/:postId/comments', authenticate, commentLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // TODO: Add rate limiting to prevent spam

    const comment = await prisma.comment.create({
      data: {
        userId,
        postId,
        text: text.trim(),
      },
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
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comments for a post
router.get('/:postId/comments', async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await prisma.comment.findMany({
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
      orderBy: { createdAt: 'asc' },
    });

    res.json({ comments, count: comments.length });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
