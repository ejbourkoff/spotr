import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const ADMIN_EMAIL = 'ejbourkoff@gmail.com';

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET!) as any;
    if (!payload.adminSession) { res.status(401).json({ error: 'Unauthorized' }); return; }
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}

// Admin login — only ejbourkoff@gmail.com
// Auth priority: ADMIN_PASSWORD env var (if set) > SPOTR account password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (email?.toLowerCase() !== ADMIN_EMAIL) {
      res.status(401).json({ error: 'Not authorized as admin' });
      return;
    }

    // If ADMIN_PASSWORD env var is set, use that directly
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword) {
      if (password !== adminPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      const token = jwt.sign({ adminSession: true }, process.env.JWT_SECRET!, { expiresIn: '24h' });
      res.json({ token });
      return;
    }

    // Fallback: verify against SPOTR account password
    const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!user?.password) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    const token = jwt.sign({ adminSession: true, userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Overview stats
router.get('/overview', adminAuth, async (_req, res) => {
  try {
    const [
      totalUsers, athletes, coaches, brands, fans,
      totalPosts, highlights, stories, reels,
      totalLikes, totalComments, totalFollows,
      totalNotifications, unreadNotifications,
      deviceTokens, totalMessages, totalConnections,
      totalOffers, totalDeals,
      notifByType,
      usersByDay,
      postsByDay,
      recentUsers,
      topPosters,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ATHLETE' } }),
      prisma.user.count({ where: { role: 'COACH' } }),
      prisma.user.count({ where: { role: 'BRAND' } }),
      prisma.user.count({ where: { role: 'FAN' } }),
      prisma.post.count({ where: { isStory: false } }),
      prisma.post.count({ where: { isHighlight: true } }),
      prisma.post.count({ where: { isStory: true } }),
      prisma.post.count({ where: { isReel: true } }),
      prisma.like.count(),
      prisma.comment.count(),
      prisma.follow.count(),
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false } }),
      prisma.deviceToken.count(),
      prisma.message.count(),
      prisma.connection.count(),
      prisma.offer.count(),
      prisma.deal.count(),
      prisma.notification.groupBy({
        by: ['type'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM posts
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          athleteProfile: { select: { name: true, sport: true } },
          coachProfile: { select: { name: true, organization: true } },
          brandProfile: { select: { name: true } },
          _count: { select: { posts: true, followers: true } },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { posts: { _count: 'desc' } },
        include: {
          athleteProfile: { select: { name: true, sport: true } },
          coachProfile: { select: { name: true } },
          _count: { select: { posts: true, followers: true } },
        },
      }),
    ]);

    res.json({
      stats: {
        totalUsers, athletes, coaches, brands, fans,
        totalPosts, highlights, stories, reels,
        totalLikes, totalComments, totalFollows,
        totalNotifications, unreadNotifications,
        deviceTokens, totalMessages, totalConnections,
        totalOffers, totalDeals,
      },
      notifByType,
      usersByDay: (usersByDay as any[]).map(r => ({ date: r.date, count: Number(r.count) })),
      postsByDay: (postsByDay as any[]).map(r => ({ date: r.date, count: Number(r.count) })),
      recentUsers,
      topPosters,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Users list
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';

    const where: any = {};
    if (role && role !== 'ALL') where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { athleteProfile: { name: { contains: search, mode: 'insensitive' } } },
        { coachProfile: { name: { contains: search, mode: 'insensitive' } } },
        { brandProfile: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          athleteProfile: { select: { name: true, sport: true, position: true, schoolTeam: true, location: true } },
          coachProfile: { select: { name: true, organization: true, sport: true } },
          brandProfile: { select: { name: true } },
          _count: { select: { posts: true, followers: true, following: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Posts list
router.get('/posts', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;
    const type = (req.query.type as string) || '';

    const where: any = {};
    if (type === 'highlight') where.isHighlight = true;
    else if (type === 'story') where.isStory = true;
    else if (type === 'reel') where.isReel = true;
    else if (type === 'regular') { where.isHighlight = false; where.isStory = false; where.isReel = false; }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              role: true,
              avatarUrl: true,
              athleteProfile: { select: { name: true } },
              coachProfile: { select: { name: true } },
              brandProfile: { select: { name: true } },
            },
          },
          _count: { select: { likes: true, comments: true, saves: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Notifications + push tokens
router.get('/notifications', adminAuth, async (_req, res) => {
  try {
    const [recent, byType, readVsUnread, deviceTokens] = await Promise.all([
      prisma.notification.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              email: true,
              athleteProfile: { select: { name: true } },
              coachProfile: { select: { name: true } },
            },
          },
          user: {
            select: {
              email: true,
              athleteProfile: { select: { name: true } },
              coachProfile: { select: { name: true } },
            },
          },
        },
      }),
      prisma.notification.groupBy({
        by: ['type'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.notification.groupBy({
        by: ['read'],
        _count: { id: true },
      }),
      prisma.deviceToken.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              role: true,
              athleteProfile: { select: { name: true } },
              coachProfile: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    res.json({ recent, byType, readVsUnread, deviceTokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Combined activity feed
router.get('/activity', adminAuth, async (_req, res) => {
  try {
    const [recentLikes, recentComments, recentFollows, recentPosts, recentSignups, recentMessages] = await Promise.all([
      prisma.like.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, avatarUrl: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } },
          post: { select: { text: true, author: { select: { athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } } } },
        },
      }),
      prisma.comment.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, avatarUrl: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } },
          post: { select: { text: true } },
        },
      }),
      prisma.follow.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: { select: { email: true, avatarUrl: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } },
          following: { select: { email: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } },
        },
      }),
      prisma.post.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { email: true, avatarUrl: true, role: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } },
        },
      }),
      prisma.user.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          athleteProfile: { select: { name: true, sport: true } },
          coachProfile: { select: { name: true, organization: true } },
        },
      }),
      prisma.message.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { email: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } },
          receiver: { select: { email: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } } } },
        },
      }),
    ]);

    res.json({ recentLikes, recentComments, recentFollows, recentPosts, recentSignups, recentMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete post
router.delete('/posts/:id', adminAuth, async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
