import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get athlete profile (public)
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await prisma.athleteProfile.findUnique({
      where: { id },
      include: {
        stats: {
          orderBy: { season: 'desc' },
        },
        highlights: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            email: true,
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

// Search athletes with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      sport,
      position,
      classYear,
      level, // TODO: This would need to be added to the schema or derived from schoolTeam
      location,
      openToNIL,
      openToSemiProPro,
      statType,
      statMinValue,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (sport) where.sport = sport as string;
    if (position) where.position = { contains: position as string, mode: 'insensitive' };
    if (classYear) where.classYear = classYear as string;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    if (openToNIL === 'true') where.openToNIL = true;
    if (openToSemiProPro === 'true') where.openToSemiProPro = true;

    // TODO: Filter by stat thresholds - this would require a join/subquery
    // For now, we'll fetch all and filter in memory (not efficient for large datasets)

    const profiles = await prisma.athleteProfile.findMany({
      where,
      include: {
        stats: true,
        user: {
          select: {
            id: true,
          },
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    // TODO: Apply stat filtering in memory for now
    let filteredProfiles = profiles;
    if (statType && statMinValue) {
      filteredProfiles = profiles.filter((profile) => {
        const relevantStat = profile.stats.find(
          (s) => s.statType === statType && s.value >= parseFloat(statMinValue as string)
        );
        return !!relevantStat;
      });
    }

    res.json({
      profiles: filteredProfiles.map((p) => ({
        ...p,
        stats: undefined, // Exclude full stats from list view for performance
      })),
      total: filteredProfiles.length,
    });
  } catch (error) {
    console.error('Search athletes error:', error);
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

export default router;
