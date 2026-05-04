import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Search users by profile name — GET /api/users/search?q=...
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const currentUserId = req.userId!;
    if (!q) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { athleteProfile: { name: { contains: q, mode: 'insensitive' } } },
          { coachProfile:   { name: { contains: q, mode: 'insensitive' } } },
          { brandProfile:   { name: { contains: q, mode: 'insensitive' } } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        avatarUrl: true,
        athleteProfile: { select: { id: true, name: true, sport: true } },
        coachProfile:   { select: { id: true, name: true, organization: true } },
        brandProfile:   { select: { id: true, name: true, organizationType: true } },
      },
      take: 20,
    });

    // Annotate with follow status relative to current user
    const followingIds = await prisma.follow.findMany({
      where: { followerId: currentUserId, followingId: { in: users.map(u => u.id) } },
      select: { followingId: true },
    });
    const followerIds = await prisma.follow.findMany({
      where: { followingId: currentUserId, followerId: { in: users.map(u => u.id) } },
      select: { followerId: true },
    });
    const iFollowSet = new Set(followingIds.map(f => f.followingId));
    const theyFollowSet = new Set(followerIds.map(f => f.followerId));

    const result = users.map(u => ({
      ...u,
      iFollow: iFollowSet.has(u.id),
      theyFollow: theyFollowSet.has(u.id),
      connected: iFollowSet.has(u.id) && theyFollowSet.has(u.id),
    }));

    res.json({ users: result });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow a user
router.post('/:userId/follow', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const followerId = req.userId!;

    if (followerId === targetUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: targetUserId,
      },
      include: {
        following: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({ follow });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Already following this user' });
    }
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow a user
router.delete('/:userId/follow', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const followerId = req.userId!;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    if (!follow) {
      return res.status(404).json({ error: 'Follow relationship not found' });
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
        },
      },
    });

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get followers of a user
router.get('/:userId/followers', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
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
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ followers, count: followers.length });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users that a user is following
router.get('/:userId/following', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
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
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ following, count: following.length });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if current user follows a specific user
router.get('/:userId/follow-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId!;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    res.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Get follow status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
