import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';

const router = express.Router();

// Create or update coach profile (onboarding)
router.post('/profile', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { name, organization, title, location, school, sport, schoolLevel, statePrefs } = req.body;

    const profile = await prisma.coachProfile.upsert({
      where: { userId },
      update: {
        name: name || '',
        organization,
        title,
        location,
        school,
        sport: sport || [],
        schoolLevel: schoolLevel || null,
        statePrefs: statePrefs || [],
      },
      create: {
        userId,
        name: name || '',
        organization,
        title,
        location,
        school,
        sport: sport || [],
        schoolLevel: schoolLevel || null,
        statePrefs: statePrefs || [],
        verified: false,
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('Update coach profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current coach's profile
router.get('/profile/me', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Coach athlete search — gated by coach_browse_enabled feature flag
router.get('/search/athletes', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { name: 'coach_browse_enabled' } });
    if (!flag?.enabled) {
      return res.status(403).json({ error: 'Coach search is not yet available', gated: true });
    }

    const { sport, position, classYear, state, page = '1', limit = '25' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (sport) where.sport = sport as string;
    if (position) where.position = { contains: position as string, mode: 'insensitive' };
    if (classYear) where.classYear = classYear as string;
    if (state) where.state = state as string;

    const [profiles, total] = await Promise.all([
      prisma.athleteProfile.findMany({
        where,
        include: {
          stats: { orderBy: { season: 'desc' }, take: 3 },
          user: { select: { id: true } },
        },
        take: parseInt(limit as string),
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.athleteProfile.count({ where }),
    ]);

    res.json({ profiles, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) {
    console.error('Coach search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coach's saved lists (recruiting boards)
router.get('/lists', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const coach = await prisma.coachProfile.findUnique({ where: { userId } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const lists = await prisma.savedList.findMany({
      where: { coachId: coach.id },
      orderBy: { createdAt: 'desc' },
      include: {
        entries: {
          orderBy: { createdAt: 'desc' },
          include: {
            athlete: {
              include: {
                user: { select: { id: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    // Shape into the format iOS expects
    const shaped = lists.map(list => ({
      id: list.id,
      name: list.name,
      entries: list.entries.map(entry => ({
        id: entry.id,
        athlete: {
          id: entry.athlete.id,
          name: entry.athlete.name,
          sport: entry.athlete.sport,
          position: entry.athlete.position,
          schoolTeam: entry.athlete.schoolTeam,
          classYear: entry.athlete.classYear,
          location: entry.athlete.location,
          height: entry.athlete.height,
          weight: entry.athlete.weight,
          user: { id: entry.athlete.user.id, avatarUrl: entry.athlete.user.avatarUrl },
        },
      })),
    }));

    res.json({ lists: shaped });
  } catch (error: any) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Delete a list
router.delete('/lists/:listId', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const { listId } = req.params;
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });
    const list = await prisma.savedList.findUnique({ where: { id: listId } });
    if (!list || list.coachId !== coach.id) return res.status(404).json({ error: 'List not found' });
    await prisma.savedList.delete({ where: { id: listId } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove athlete from list
router.delete('/lists/:listId/athletes/:athleteId', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const { listId, athleteId } = req.params;
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });
    const list = await prisma.savedList.findUnique({ where: { id: listId } });
    if (!list || list.coachId !== coach.id) return res.status(404).json({ error: 'List not found' });
    await prisma.savedListEntry.deleteMany({ where: { listId, athleteId } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new list
router.post('/lists', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'List name is required' });

    const coach = await prisma.coachProfile.findUnique({ where: { userId } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const list = await prisma.savedList.create({
      data: { name, type: 'COACH', coachId: coach.id },
    });

    res.status(201).json({ list });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/coaches/watchlist — flat list of all athletes across all boards
router.get('/watchlist', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const entries = await prisma.savedListEntry.findMany({
      where: { list: { coachId: coach.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        athlete: {
          include: {
            user: { select: { id: true, avatarUrl: true } },
          },
        },
        list: { select: { id: true, name: true } },
      },
    });

    // Deduplicate by athleteId — same athlete can be in multiple boards
    const seen = new Set<string>();
    const unique = entries
      .filter(e => {
        if (seen.has(e.athleteId)) return false;
        seen.add(e.athleteId);
        return true;
      })
      .map(e => ({
        id: e.id,
        athleteId: e.athleteId,
        athlete: {
          id: e.athlete.id,
          name: e.athlete.name,
          sport: e.athlete.sport,
          position: e.athlete.position,
          schoolTeam: e.athlete.schoolTeam,
          classYear: e.athlete.classYear,
          location: e.athlete.location,
          height: e.athlete.height,
          weight: e.athlete.weight,
          user: { id: e.athlete.user.id, avatarUrl: e.athlete.user.avatarUrl },
        },
        list: e.list,
      }));

    res.json({ athletes: unique, count: unique.length });
  } catch (error: any) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Add athlete to list
router.post('/lists/:listId/athletes', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const { listId } = req.params;
    const { athleteId } = req.body;
    if (!athleteId) return res.status(400).json({ error: 'Athlete ID is required' });

    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const list = await prisma.savedList.findUnique({ where: { id: listId } });
    if (!list || list.coachId !== coach.id) return res.status(404).json({ error: 'List not found' });

    const entry = await prisma.savedListEntry.create({
      data: { listId, athleteId },
      include: { athlete: true },
    });

    // Notify the athlete that a coach is recruiting them (only on first add across all lists)
    if (entry.athlete?.userId) {
      const otherEntries = await prisma.savedListEntry.count({
        where: {
          athleteId,
          list: { coachId: coach.id },
          id: { not: entry.id },
        },
      });
      if (otherEntries === 0) {
        await createNotification(entry.athlete.userId, req.userId!, 'coach_interest');
      }
    }

    res.status(201).json({ entry });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Athlete already in list' });
    console.error('Add athlete to list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Extend a recruiting offer to an athlete — POST /api/coaches/offers
router.post('/offers', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const { athleteId, offerType, note } = req.body;
    if (!athleteId || !offerType) {
      return res.status(400).json({ error: 'athleteId and offerType are required' });
    }
    const VALID = ['PREFERRED_WALK_ON', 'PARTIAL', 'FULL'];
    if (!VALID.includes(offerType)) {
      return res.status(400).json({ error: 'Invalid offerType' });
    }

    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const athlete = await prisma.athleteProfile.findUnique({
      where: { id: athleteId },
      select: { id: true, userId: true },
    });
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

    // One active (pending) offer per coach→athlete pair
    const existing = await prisma.coachOffer.findFirst({
      where: { coachId: coach.id, athleteId, status: 'PENDING' },
    });
    if (existing) return res.status(400).json({ error: 'You already have a pending offer to this athlete' });

    const offer = await prisma.coachOffer.create({
      data: { coachId: coach.id, athleteId, offerType, note: note ?? null },
    });

    await createNotification(athlete.userId, req.userId!, 'coach_offer');

    res.status(201).json({ offer });
  } catch (error) {
    console.error('Extend offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Offers this coach has sent — GET /api/coaches/offers
router.get('/offers', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const offers = await prisma.coachOffer.findMany({
      where: { coachId: coach.id },
      include: { athlete: { select: { id: true, name: true, sport: true, position: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ offers });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Roster Needs — coach declares gaps; we compute how many saved athletes fill each
// and how many discoverable prospects match.

function needAthleteWhere(sport: string, position: string, classYear: string | null) {
  const w: any = {
    sport:    { contains: sport,    mode: 'insensitive' },
    position: { contains: position, mode: 'insensitive' },
  };
  if (classYear) w.classYear = classYear;
  return w;
}

// GET /api/coaches/needs — list needs with fill + match counts
router.get('/needs', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const needs = await prisma.rosterNeed.findMany({
      where: { coachId: coach.id },
      orderBy: { createdAt: 'asc' },
    });

    const result = await Promise.all(needs.map(async n => {
      const athleteWhere = needAthleteWhere(n.sport, n.position, n.classYear);
      const [filled, matchCount] = await Promise.all([
        // saved (boarded) athletes that match this need
        prisma.savedListEntry.count({
          where: { list: { coachId: coach.id }, athlete: { is: athleteWhere } },
        }),
        prisma.athleteProfile.count({ where: athleteWhere }),
      ]);
      return { ...n, filled, matchCount };
    }));

    res.json({ needs: result });
  } catch (error) {
    console.error('Get needs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/coaches/needs — create a need
router.post('/needs', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const { sport, position, classYear, slots } = req.body;
    if (!sport || !position) return res.status(400).json({ error: 'sport and position are required' });
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const need = await prisma.rosterNeed.create({
      data: {
        coachId: coach.id, sport, position,
        classYear: classYear ?? null,
        slots: Math.max(1, parseInt(slots ?? '1', 10) || 1),
      },
    });
    res.status(201).json({ need: { ...need, filled: 0, matchCount: 0 } });
  } catch (error) {
    console.error('Create need error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/coaches/needs/:id
router.delete('/needs/:id', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });
    const need = await prisma.rosterNeed.findUnique({ where: { id: req.params.id } });
    if (!need || need.coachId !== coach.id) return res.status(404).json({ error: 'Need not found' });
    await prisma.rosterNeed.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/coaches/needs/:id/matches — prospects matching a need
router.get('/needs/:id/matches', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });
    const need = await prisma.rosterNeed.findUnique({ where: { id: req.params.id } });
    if (!need || need.coachId !== coach.id) return res.status(404).json({ error: 'Need not found' });

    const profiles = await prisma.athleteProfile.findMany({
      where: needAthleteWhere(need.sport, need.position, need.classYear),
      take: 50,
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, avatarUrl: true } } },
    });

    const athletes = profiles.map(p => ({
      id: p.id, userId: p.user.id, name: p.name, sport: p.sport, position: p.position,
      schoolTeam: p.schoolTeam, classYear: p.classYear, location: p.location, state: p.state,
      height: p.height, weight: p.weight, pinnedReelUrl: p.pinnedReelUrl,
      avatarUrl: p.user.avatarUrl, openToNIL: p.openToNIL, topStats: [], iFollow: false,
    }));
    res.json({ athletes });
  } catch (error) {
    console.error('Need matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rising prospects — athletes with the most engagement momentum over the last 7 days.
// GET /api/coaches/rising?sport=&state=&limit=
router.get('/rising', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const { sport, state, limit = '15' } = req.query;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Momentum signals in the window, grouped by the athlete's userId
    const [follows, views] = await Promise.all([
      prisma.follow.groupBy({
        by: ['followingId'],
        where: { createdAt: { gte: since } },
        _count: { followingId: true },
      }),
      prisma.profileView.groupBy({
        by: ['profileUserId'],
        where: { createdAt: { gte: since } },
        _count: { profileUserId: true },
      }),
    ]);

    const score = new Map<string, { follows: number; views: number }>();
    for (const f of follows) {
      const s = score.get(f.followingId) ?? { follows: 0, views: 0 };
      s.follows = f._count.followingId;
      score.set(f.followingId, s);
    }
    for (const v of views) {
      const s = score.get(v.profileUserId) ?? { follows: 0, views: 0 };
      s.views = v._count.profileUserId;
      score.set(v.profileUserId, s);
    }
    if (score.size === 0) return res.json({ prospects: [] });

    // Athlete profiles for the moving userIds, filtered to the coach's sport/region
    const where: any = { userId: { in: [...score.keys()] } };
    if (sport) where.sport = { contains: sport as string, mode: 'insensitive' };
    if (state) where.state = state as string;

    const profiles = await prisma.athleteProfile.findMany({
      where,
      include: { user: { select: { id: true, avatarUrl: true } } },
    });

    const prospects = profiles
      .map(p => {
        const s = score.get(p.userId) ?? { follows: 0, views: 0 };
        return {
          id: p.id,
          userId: p.userId,
          name: p.name,
          sport: p.sport,
          position: p.position,
          classYear: p.classYear,
          state: p.state,
          height: p.height,
          schoolTeam: p.schoolTeam,
          avatarUrl: p.user.avatarUrl,
          newFollowers: s.follows,
          recentViews: s.views,
          trendScore: s.follows * 2 + s.views,
        };
      })
      .filter(p => p.trendScore > 0)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, parseInt(limit as string));

    res.json({ prospects });
  } catch (error) {
    console.error('Rising prospects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New Film — recent highlights posted by athletes on the coach's boards.
// GET /api/coaches/new-film?days=7
router.get('/new-film', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const coach = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!coach) return res.status(404).json({ error: 'Coach profile not found' });

    const entries = await prisma.savedListEntry.findMany({
      where: { list: { coachId: coach.id } },
      select: { athlete: { select: { userId: true } } },
    });
    const userIds = [...new Set(entries.map(e => e.athlete.userId))];
    if (userIds.length === 0) return res.json({ reels: [], athleteCount: 0 });

    const since = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
    const reels = await prisma.post.findMany({
      where: { authorId: { in: userIds }, isReel: true, createdAt: { gte: since } },
      include: {
        author: {
          select: {
            id: true, role: true, avatarUrl: true,
            athleteProfile: {
              select: { id: true, name: true, sport: true, position: true, schoolTeam: true, classYear: true, location: true, state: true, height: true, openToNIL: true },
            },
          },
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const distinctAthletes = new Set(reels.map(r => r.author.id)).size;
    res.json({ reels: reels.map(r => ({ ...r, isLiked: false, isSaved: false })), athleteCount: distinctAthletes });
  } catch (error) {
    console.error('New film error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scout Feed — vertical film feed of prospect highlights matching filters.
// GET /api/coaches/scout-feed?sport=&position=&classYear=&state=&limit=&offset=
router.get('/scout-feed', authenticate, requireRole('COACH'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { sport, position, classYear, state, limit = '10', offset = '0' } = req.query;

    const athleteWhere: any = {};
    if (sport)     athleteWhere.sport     = { contains: sport as string,    mode: 'insensitive' };
    if (position)  athleteWhere.position  = { contains: position as string, mode: 'insensitive' };
    if (classYear) athleteWhere.classYear = classYear as string;
    if (state)     athleteWhere.state     = state as string;

    const reels = await prisma.post.findMany({
      where: {
        isReel: true,
        author: { role: 'ATHLETE', athleteProfile: { is: athleteWhere } },
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            avatarUrl: true,
            athleteProfile: {
              select: {
                id: true, name: true, sport: true, position: true, schoolTeam: true,
                classYear: true, location: true, state: true, height: true,
                openToNIL: true,
              },
            },
          },
        },
        _count: { select: { likes: true, comments: true, saves: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const likedPostIds = new Set(
      (await prisma.like.findMany({
        where: { userId, postId: { in: reels.map(r => r.id) } },
        select: { postId: true },
      })).map(l => l.postId)
    );

    const result = reels.map(reel => ({ ...reel, isLiked: likedPostIds.has(reel.id), isSaved: false }));
    res.json({ reels: result, total: result.length });
  } catch (error) {
    console.error('Scout feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
