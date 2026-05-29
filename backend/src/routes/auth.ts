import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiters';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Sign up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    if (!['ATHLETE', 'COACH', 'BRAND', 'FAN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role as 'ATHLETE' | 'COACH' | 'BRAND' | 'FAN',
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Create profile based on role
    if (role === 'ATHLETE') {
      await prisma.athleteProfile.create({
        data: {
          userId: user.id,
          name: '', // Will be filled in profile edit
          sport: '',
        },
      });
    } else if (role === 'COACH') {
      await prisma.coachProfile.create({
        data: {
          userId: user.id,
          name: '',
        },
      });
    } else if (role === 'BRAND') {
      await prisma.brandProfile.create({
        data: {
          userId: user.id,
          name: '',
        },
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: profileSelect });
    res.status(201).json({ user: fullUser, token });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error?.message });
  }
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Google-only account — no password set
    if (!user.password) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please sign in with Google.' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: profileSelect });
    res.json({ user: fullUser, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const profileSelect = {
  id: true,
  email: true,
  role: true,
  avatarUrl: true,
  athleteProfile: {
    select: { id: true, name: true, sport: true, bio: true, position: true, schoolTeam: true, classYear: true, location: true, openToNIL: true, slug: true },
  },
  coachProfile: {
    select: { id: true, name: true, organization: true, title: true, school: true, bio: true, bioLink: true, location: true, sport: true, statePrefs: true, verified: true },
  },
  brandProfile: {
    select: { id: true, name: true, organizationType: true },
  },
};

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: profileSelect });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update current user profile (name, bio, sport, avatarUrl)
router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { avatarUrl, name, bio, sport } = req.body;

    if (avatarUrl !== undefined) {
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    }

    if (name !== undefined) {
      const userRole = (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role;
      if (userRole === 'ATHLETE') {
        await prisma.athleteProfile.update({
          where: { userId },
          data: { name, ...(bio !== undefined && { bio }), ...(sport !== undefined && { sport }) },
        });
      } else if (userRole === 'COACH') {
        await prisma.coachProfile.update({ where: { userId }, data: { name } });
      } else if (userRole === 'BRAND') {
        await prisma.brandProfile.update({ where: { userId }, data: { name } });
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
    res.json({ user });
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google Sign-In
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID token required' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ error: 'Invalid Google token' });

    const email = payload.email;
    const displayName = payload.name || email.split('@')[0];
    const googleAvatarUrl = payload.picture || null;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          password: '',
          role: 'ATHLETE',
          ...(googleAvatarUrl && { avatarUrl: googleAvatarUrl }),
        },
      });
      await prisma.athleteProfile.create({
        data: { userId: user.id, name: displayName, sport: '' },
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: profileSelect });
    res.json({ user: fullUser, token });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Google sign-in failed' });
  }
});

export default router;
