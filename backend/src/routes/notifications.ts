import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

const actorInclude = {
  select: {
    id: true,
    avatarUrl: true,
    athleteProfile: { select: { name: true } },
    coachProfile:   { select: { name: true } },
    brandProfile:   { select: { name: true } },
  },
};

// GET /api/notifications — paginated, newest first
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = '30', offset = '0' } = req.query;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        include: {
          actor: actorInclude,
          post: { select: { id: true, text: true, mediaUrl: true, thumbnailUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId!, read: false },
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// Helper used by other routes to fire notifications without blocking responses
export async function createNotification(
  userId: string,
  actorId: string,
  type: string,
  postId?: string
) {
  if (userId === actorId) return; // never notify yourself
  try {
    await prisma.notification.create({
      data: { userId, actorId, type, postId: postId ?? null },
    });
  } catch {
    // non-fatal
  }
}
