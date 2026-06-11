import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

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

    res.status(201).json({ entry });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Athlete already in list' });
    console.error('Add athlete to list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
