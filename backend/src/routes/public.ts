import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Public athlete profile by slug — no auth required
router.get('/athletes/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    let viewerUserId: string | null = null;
    let viewerRole: string | null = null;

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
        viewerUserId = decoded.userId;
        viewerRole = decoded.role;
      } catch {}
    }

    const profile = await prisma.athleteProfile.findUnique({
      where: { slug },
      include: {
        stats: { orderBy: { season: 'desc' } },
        highlights: { orderBy: { createdAt: 'desc' } },
        shortLinks: { take: 1, orderBy: { createdAt: 'asc' } },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Athlete profile not found' });
    }

    // Determine if the viewer is a verified coach
    let isVerifiedCoach = false;
    if (viewerUserId && viewerRole === 'COACH') {
      const coach = await prisma.coachProfile.findUnique({ where: { userId: viewerUserId } });
      isVerifiedCoach = coach?.verified ?? false;
    }

    // Field visibility: email/phone only for verified coaches or the athlete themselves
    const canSeeContact = isVerifiedCoach || viewerUserId === profile.userId;

    const response = {
      profile: {
        ...profile,
        user: {
          id: profile.user.id,
          email: canSeeContact ? profile.user.email : undefined,
          phone: canSeeContact ? profile.user.phone : undefined,
        },
      },
      isVerifiedCoach,
      canSeeContact,
    };

    res.json(response);
  } catch (error) {
    console.error('Public athlete profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Short link redirect — /api/public/s/:code → 302 to /athletes/:slug
router.get('/s/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const link = await prisma.athleteShortLink.findUnique({
      where: { code },
      include: { athlete: { select: { slug: true } } },
    });

    if (!link || !link.athlete.slug) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:3000'}/athletes/${link.athlete.slug}`);
  } catch (error) {
    console.error('Short link redirect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate short link for an athlete (athlete only)
router.post('/athletes/:slug/short-link', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const profile = await prisma.athleteProfile.findUnique({
      where: { slug },
      include: { shortLinks: { take: 1, orderBy: { createdAt: 'asc' } } },
    });

    if (!profile) return res.status(404).json({ error: 'Athlete not found' });
    if (profile.userId !== req.userId) return res.status(403).json({ error: 'Not your profile' });

    // Return existing link if one exists
    if (profile.shortLinks.length > 0) {
      return res.json({ code: profile.shortLinks[0].code });
    }

    // Generate unique 6-char alphanumeric code
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    let attempts = 0;
    while (attempts < 5) {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const existing = await prisma.athleteShortLink.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    }

    const link = await prisma.athleteShortLink.create({
      data: { code, athleteId: profile.id },
    });

    res.json({ code: link.code });
  } catch (error) {
    console.error('Short link generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Feature flag check
router.get('/flags/:name', async (req: Request, res: Response) => {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { name: req.params.name } });
    res.json({ enabled: flag?.enabled ?? false });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
