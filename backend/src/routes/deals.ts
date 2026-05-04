import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get deals for authenticated user (athlete or brand)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const userRole = req.userRole!;

    let deals;

    if (userRole === 'ATHLETE') {
      const athlete = await prisma.athleteProfile.findUnique({
        where: { userId },
      });

      if (!athlete) {
        return res.status(404).json({ error: 'Athlete profile not found' });
      }

      deals = await prisma.deal.findMany({
        where: {
          offer: {
            athleteId: athlete.id,
          },
        },
        include: {
          offer: {
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (userRole === 'BRAND') {
      const brand = await prisma.brandProfile.findUnique({
        where: { userId },
      });

      if (!brand) {
        return res.status(404).json({ error: 'Brand profile not found' });
      }

      deals = await prisma.deal.findMany({
        where: {
          offer: {
            brandId: brand.id,
          },
        },
        include: {
          offer: {
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ deals });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update deal status (mark as completed) — callable by either the athlete or brand on the deal
router.put('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        offer: {
          include: {
            brand: { select: { userId: true } },
            athlete: { select: { userId: true } },
          },
        },
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const isParty =
      deal.offer.athlete.userId === userId ||
      deal.offer.brand.userId === userId;

    if (!isParty) {
      return res.status(403).json({ error: 'Only the athlete or brand on this deal can mark it complete' });
    }

    if (deal.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Deal is already completed' });
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
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

    res.json({ deal: updatedDeal });
  } catch (error) {
    console.error('Complete deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
