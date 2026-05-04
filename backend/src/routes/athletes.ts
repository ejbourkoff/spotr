import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get athlete profile by slug (public, no auth needed but token optional for email reveal)
router.get('/by-slug/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.athleteProfile.findUnique({
      where: { slug: req.params.slug },
      include: {
        stats: { orderBy: { season: 'desc' } },
        highlights: { orderBy: { createdAt: 'desc' } },
        user: { select: { id: true } },
      },
    });
    if (!profile) return res.status(404).json({ error: 'Athlete not found' });
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List athletes — returns SearchUser format for iOS Discover
// Optionally authenticated: if Bearer token present, annotates with iFollow
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId!;
    const { sport, limit = '50', offset = '0' } = req.query;

    const where: any = { athleteProfile: { isNot: null } };
    if (sport) where.athleteProfile = { sport: sport as string };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        avatarUrl: true,
        athleteProfile: { select: { id: true, name: true, sport: true, openToNIL: true } },
        coachProfile:   { select: { id: true, name: true, organization: true } },
        brandProfile:   { select: { id: true, name: true, organizationType: true } },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    // Annotate with follow status
    const followingRecords = await prisma.follow.findMany({
      where: { followerId: currentUserId, followingId: { in: users.map(u => u.id) } },
      select: { followingId: true },
    });
    const iFollowSet = new Set(followingRecords.map(f => f.followingId));
    const result = users.map(u => ({ ...u, iFollow: iFollowSet.has(u.id) }));

    res.json({ athletes: result });
  } catch (error) {
    console.error('List athletes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user with full profile by userId (used by iOS ProfileView)
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId!;
    const targetUserId = req.params.userId;

    const [user, followRecord] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          role: true,
          avatarUrl: true,
          athleteProfile: { select: { id: true, name: true, sport: true, bio: true, position: true, schoolTeam: true, classYear: true, location: true, openToNIL: true, openToSemiProPro: true, slug: true } },
          coachProfile:   { select: { id: true, name: true, organization: true, title: true, school: true } },
          brandProfile:   { select: { id: true, name: true, organizationType: true } },
        },
      }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } },
      }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { ...user, iFollow: !!followRecord } });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update athlete profile (authenticated athlete only)
router.post('/profile', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const {
      name,
      sport,
      position,
      schoolTeam,
      classYear,
      location,
      state,
      height,
      weight,
      bio,
      hudlUrl,
      openToNIL,
      openToSemiProPro,
    } = req.body;

    // Generate slug if creating for the first time
    const existing = await prisma.athleteProfile.findUnique({ where: { userId }, select: { slug: true } });
    let slug = existing?.slug;
    if (!slug && name) {
      const base = (name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      slug = base + '-' + userId.slice(-6);
    }

    const profile = await prisma.athleteProfile.upsert({
      where: { userId },
      update: {
        name,
        sport,
        position,
        schoolTeam,
        classYear,
        location,
        state,
        height,
        weight,
        bio,
        hudlUrl,
        openToNIL: openToNIL ?? false,
        openToSemiProPro: openToSemiProPro ?? false,
      },
      create: {
        userId,
        slug,
        name: name || '',
        sport: sport || '',
        position,
        schoolTeam,
        classYear,
        location,
        state,
        height,
        weight,
        bio,
        hudlUrl,
        openToNIL: openToNIL ?? false,
        openToSemiProPro: openToSemiProPro ?? false,
      },
      include: {
        stats: true,
        highlights: true,
        user: { select: { id: true, avatarUrl: true } },
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('Update athlete profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current athlete's own profile
router.get('/profile/me', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const profile = await prisma.athleteProfile.findUnique({
      where: { userId },
      include: {
        stats: {
          orderBy: { season: 'desc' },
        },
        highlights: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: { id: true, avatarUrl: true },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add stat line
router.post('/profile/stats', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { season, statType, value } = req.body;

    if (!season || !statType || value === undefined) {
      return res.status(400).json({ error: 'Season, statType, and value are required' });
    }

    const athlete = await prisma.athleteProfile.findUnique({
      where: { userId },
    });

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete profile not found' });
    }

    const statLine = await prisma.statLine.create({
      data: {
        athleteId: athlete.id,
        season,
        statType,
        value: parseFloat(value),
      },
    });

    res.status(201).json({ statLine });
  } catch (error) {
    console.error('Add stat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete stat line
router.delete('/profile/stats/:id', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const athlete = await prisma.athleteProfile.findUnique({ where: { userId } });
    if (!athlete) return res.status(404).json({ error: 'Athlete profile not found' });

    const stat = await prisma.statLine.findUnique({ where: { id } });
    if (!stat || stat.athleteId !== athlete.id) {
      return res.status(404).json({ error: 'Stat not found' });
    }

    await prisma.statLine.delete({ where: { id } });
    res.json({ message: 'Stat deleted' });
  } catch (error) {
    console.error('Delete stat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add highlight
router.post('/profile/highlights', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { url, title, description, tags, opponent, gameDate, season } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const athlete = await prisma.athleteProfile.findUnique({
      where: { userId },
    });

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete profile not found' });
    }

    const highlight = await prisma.highlight.create({
      data: {
        athleteId: athlete.id,
        url,
        title,
        description,
        tags,
        opponent,
        gameDate: gameDate ? new Date(gameDate) : null,
        season,
      },
    });

    res.status(201).json({ highlight });
  } catch (error) {
    console.error('Add highlight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get athlete profile by athleteProfile.id — must be last (wildcard catches everything)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await prisma.athleteProfile.findUnique({
      where: { id },
      include: {
        stats: { orderBy: { season: 'desc' } },
        highlights: { orderBy: { createdAt: 'desc' } },
        user: {
          select: {
            id: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Athlete profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get athlete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
