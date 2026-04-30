import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Create an offer (brand → athlete)
router.post('/', authenticate, requireRole('BRAND'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const {
      athleteId,
      deliverables,
      campaignStartDate,
      campaignEndDate,
      compensationAmount,
      notes,
    } = req.body;

    if (!athleteId || !deliverables || !campaignStartDate || !campaignEndDate || compensationAmount === undefined) {
      return res.status(400).json({
        error: 'Athlete ID, deliverables, campaign dates, and compensation amount are required',
      });
    }

    const brand = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!brand) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    // Verify athlete exists
    const athlete = await prisma.athleteProfile.findUnique({
      where: { id: athleteId },
    });

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const offer = await prisma.offer.create({
      data: {
        brandId: brand.id,
        athleteId,
        deliverables,
        campaignStartDate: new Date(campaignStartDate),
        campaignEndDate: new Date(campaignEndDate),
        compensationAmount: parseFloat(compensationAmount),
        notes,
        status: 'PENDING',
      },
      include: {
        brand: true,
        athlete: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json({ offer });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get offers for authenticated athlete
router.get('/', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const athlete = await prisma.athleteProfile.findUnique({
      where: { userId },
    });

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete profile not found' });
    }

    const offers = await prisma.offer.findMany({
      where: { athleteId: athlete.id },
      include: {
        brand: {
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

// Get single offer
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const userRole = req.userRole!;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        brand: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        athlete: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        deal: true,
      },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Verify user has access (either the athlete or the brand)
    if (userRole === 'ATHLETE') {
      const athlete = await prisma.athleteProfile.findUnique({
        where: { userId },
      });
      if (offer.athleteId !== athlete?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'BRAND') {
      const brand = await prisma.brandProfile.findUnique({
        where: { userId },
      });
      if (offer.brandId !== brand?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ offer });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept offer (athlete only)
router.put('/:id/accept', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const athlete = await prisma.athleteProfile.findUnique({
      where: { userId },
    });

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete profile not found' });
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.athleteId !== athlete.id) {
      return res.status(403).json({ error: 'You can only accept your own offers' });
    }

    if (offer.status !== 'PENDING') {
      return res.status(400).json({ error: 'Offer is not pending' });
    }

    // Update offer status
    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    // Create deal
    const deal = await prisma.deal.create({
      data: {
        offerId: id,
        athleteId: athlete.id,
        status: 'ACTIVE',
      },
      include: {
        offer: {
          include: {
            brand: true,
            athlete: true,
          },
        },
      },
    });

    res.json({ offer: updatedOffer, deal });
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline offer (athlete only)
router.put('/:id/decline', authenticate, requireRole('ATHLETE'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const athlete = await prisma.athleteProfile.findUnique({
      where: { userId },
    });

    if (!athlete) {
      return res.status(404).json({ error: 'Athlete profile not found' });
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.athleteId !== athlete.id) {
      return res.status(403).json({ error: 'You can only decline your own offers' });
    }

    if (offer.status !== 'PENDING') {
      return res.status(400).json({ error: 'Offer is not pending' });
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: { status: 'DECLINED' },
    });

    res.json({ offer: updatedOffer });
  } catch (error) {
    console.error('Decline offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
