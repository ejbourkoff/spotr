import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get or create brand profile
router.post('/profile', authenticate, requireRole('BRAND'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { name, organizationType, location } = req.body;

    const profile = await prisma.brandProfile.upsert({
      where: { userId },
      update: {
        name: name || '',
        organizationType,
        location,
      },
      create: {
        userId,
        name: name || '',
        organizationType,
        location,
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('Update brand profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get brand's saved lists
router.get('/lists', authenticate, requireRole('BRAND'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const brand = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!brand) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    const lists = await prisma.savedList.findMany({
      where: { brandId: brand.id },
      include: {
        entries: {
          include: {
            athlete: {
              include: {
                user: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    res.json({ lists });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new list
router.post('/lists', authenticate, requireRole('BRAND'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'List name is required' });
    }

    const brand = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!brand) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    const list = await prisma.savedList.create({
      data: {
        name,
        type: 'BRAND',
        brandId: brand.id,
      },
    });

    res.status(201).json({ list });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add athlete to list
router.post('/lists/:listId/athletes', authenticate, requireRole('BRAND'), async (req: AuthRequest, res: Response) => {
  try {
    const { listId } = req.params;
    const { athleteId } = req.body;

    if (!athleteId) {
      return res.status(400).json({ error: 'Athlete ID is required' });
    }

    // Verify list belongs to this brand
    const userId = req.userId!;
    const brand = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!brand) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    const list = await prisma.savedList.findUnique({
      where: { id: listId },
    });

    if (!list || list.brandId !== brand.id) {
      return res.status(404).json({ error: 'List not found' });
    }

    const entry = await prisma.savedListEntry.create({
      data: {
        listId,
        athleteId,
      },
      include: {
        athlete: true,
      },
    });

    res.status(201).json({ entry });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Athlete already in list' });
    }
    console.error('Add athlete to list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get brand's offers
router.get('/offers', authenticate, requireRole('BRAND'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const brand = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!brand) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    const offers = await prisma.offer.findMany({
      where: { brandId: brand.id },
      include: {
        athlete: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        deal: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ offers });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
