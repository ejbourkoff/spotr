import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendPush } from '../lib/apns';

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

// POST /api/notifications/test-push — sends a test push to yourself
router.post('/test-push', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: req.userId! },
      select: { token: true },
    });
    if (tokens.length === 0) {
      res.status(404).json({ error: 'No device tokens registered for this user' });
      return;
    }
    await sendPush(tokens.map(t => t.token), 'Test push from SPOTR 🏆', { notificationType: 'test' });
    res.json({ success: true, tokenCount: tokens.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/device-token
router.post('/device-token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'token required' });
      return;
    }
    await prisma.deviceToken.upsert({
      where: { token },
      create: { userId: req.userId!, token, platform: 'ios' },
      update: { userId: req.userId! },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

function pushBody(type: string, actorName: string): string {
  switch (type) {
    case 'like':                return `${actorName} liked your post`;
    case 'comment':             return `${actorName} commented on your post`;
    case 'follow':              return `${actorName} started following you`;
    case 'share':               return `${actorName} shared your post`;
    case 'mention':             return `${actorName} mentioned you`;
    case 'connection_request':  return `${actorName} wants to connect`;
    case 'connection_accepted': return `${actorName} accepted your connection`;
    case 'coach_interest':      return `${actorName} is recruiting you`;
    case 'coach_offer':         return `${actorName} extended you an offer`;
    case 'offer_accepted':      return `${actorName} accepted your offer`;
    case 'offer_declined':      return `${actorName} declined your offer`;
    default:                    return `New notification from ${actorName}`;
  }
}

// Helper used by other routes to fire notifications without blocking responses
export async function createNotification(
  userId: string,
  actorId: string,
  type: string,
  postId?: string
) {
  if (userId === actorId) return;
  try {
    await prisma.notification.create({
      data: { userId, actorId, type, postId: postId ?? null },
    });

    // Send push notification
    const [tokens, actor] = await Promise.all([
      prisma.deviceToken.findMany({ where: { userId }, select: { token: true } }),
      prisma.user.findUnique({
        where: { id: actorId },
        select: {
          athleteProfile: { select: { name: true } },
          coachProfile:   { select: { name: true } },
          brandProfile:   { select: { name: true } },
        },
      }),
    ]);

    if (tokens.length > 0) {
      const actorName = actor?.athleteProfile?.name ?? actor?.coachProfile?.name ?? actor?.brandProfile?.name ?? 'Someone';
      const body = pushBody(type, actorName);
      const data: Record<string, string> = { notificationType: type, actorId };
      if (postId) data.postId = postId;
      await sendPush(tokens.map(t => t.token), body, data);
    }
  } catch {
    // non-fatal
  }
}
