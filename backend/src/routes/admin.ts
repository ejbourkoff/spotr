import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

function adminAuth(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

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

// Analytics dashboard data
router.get('/analytics', adminAuth, async (_req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [
      dauToday, sessionsToday, avgDuration, screenViewsToday, eventsToday,
      dauByDay, sessionsByDay, topScreens, topEvents, recentSessions, newVsReturning,
    ] = await Promise.all([
      prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(DISTINCT user_id)::int as count FROM analytics_events WHERE created_at >= ${today} AND user_id IS NOT NULL`,
      prisma.analyticsSession.count({ where: { startedAt: { gte: today } } }),
      prisma.$queryRaw<{ avg: number }[]>`SELECT AVG(duration_ms)::int as avg FROM analytics_sessions WHERE duration_ms IS NOT NULL AND duration_ms > 0`,
      prisma.analyticsEvent.count({ where: { event: 'screen_view', createdAt: { gte: today } } }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: today } } }),
      prisma.$queryRaw<{ date: Date; count: number }[]>`SELECT DATE(created_at) as date, COUNT(DISTINCT user_id)::int as count FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days' AND user_id IS NOT NULL GROUP BY DATE(created_at) ORDER BY date ASC`,
      prisma.$queryRaw<{ date: Date; count: number }[]>`SELECT DATE(started_at) as date, COUNT(*)::int as count FROM analytics_sessions WHERE started_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(started_at) ORDER BY date ASC`,
      prisma.$queryRaw<{ screen: string; views: number }[]>`SELECT screen, COUNT(*)::int as views FROM analytics_events WHERE event = 'screen_view' AND screen IS NOT NULL GROUP BY screen ORDER BY views DESC LIMIT 12`,
      prisma.$queryRaw<{ event: string; count: number }[]>`SELECT event, COUNT(*)::int as count FROM analytics_events GROUP BY event ORDER BY count DESC LIMIT 20`,
      prisma.analyticsSession.findMany({
        take: 30,
        orderBy: { startedAt: 'desc' },
        select: { sessionKey: true, userId: true, startedAt: true, endedAt: true, durationMs: true, screenViews: true, appVersion: true, osVersion: true },
      }),
      prisma.$queryRaw<{ type: string; count: number }[]>`
        SELECT CASE WHEN s.session_count = 1 THEN 'new' ELSE 'returning' END as type, COUNT(*)::int as count
        FROM (SELECT user_id, COUNT(*) as session_count FROM analytics_sessions WHERE user_id IS NOT NULL GROUP BY user_id) s
        GROUP BY type
      `,
    ]);

    res.json({
      today: {
        dau: dauToday[0]?.count || 0,
        sessions: sessionsToday,
        avgSessionMs: avgDuration[0]?.avg || 0,
        screenViews: screenViewsToday,
        events: eventsToday,
      },
      dauByDay: dauByDay.map(r => ({ date: r.date, count: Number(r.count) })),
      sessionsByDay: sessionsByDay.map(r => ({ date: r.date, count: Number(r.count) })),
      topScreens: topScreens.map(r => ({ screen: r.screen, views: Number(r.views) })),
      topEvents: topEvents.map(r => ({ event: r.event, count: Number(r.count) })),
      recentSessions,
      newVsReturning: newVsReturning.map(r => ({ type: r.type, count: Number(r.count) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
