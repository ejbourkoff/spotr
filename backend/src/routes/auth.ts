import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
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
    select: { id: true, name: true, organization: true, title: true, school: true, bio: true, bioLink: true, location: true, sport: true, statePrefs: true, verified: true, schoolLevel: true },
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
    console.error('Google auth error:', error?.message || error);
    res.status(401).json({ error: `Google auth failed: ${error?.message || 'Unknown error'}` });
  }
});

// Apple Sign-In
router.post('/apple', async (req: Request, res: Response) => {
  try {
    const { identityToken, fullName } = req.body;
    if (!identityToken) return res.status(400).json({ error: 'identityToken required' });

    const claims = await appleSignin.verifyIdToken(identityToken, {
      audience: 'com.evan.SPOTR',
      ignoreExpiration: false,
    }) as { sub: string; email?: string };

    const appleId = claims.sub;
    const email = claims.email;

    // Find by appleId first, then fall back to email
    let user = await prisma.user.findUnique({ where: { appleId } });

    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Link Apple ID to existing account
        user = await prisma.user.update({ where: { id: user.id }, data: { appleId } });
      }
    }

    if (!user) {
      // New account — need an email to create one
      const accountEmail = email ?? `apple_${appleId}@privaterelay.appleid.com`;
      const displayName = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ') || accountEmail.split('@')[0];

      user = await prisma.user.create({
        data: { email: accountEmail, password: '', role: 'ATHLETE', appleId },
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
    console.error('Apple auth error:', error?.message || error);
    res.status(401).json({ error: `Apple auth failed: ${error?.message || 'Unknown error'}` });
  }
});

// Change password
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = user.password ? await bcrypt.compare(currentPassword, user.password) : false;
    if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId! }, data: { password: hashed } });
    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change email
router.put('/change-email', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) return res.status(400).json({ error: 'newEmail and password required' });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!isValid) return res.status(401).json({ error: 'Password is incorrect' });

    const existing = await prisma.user.findUnique({ where: { email: newEmail.toLowerCase() } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    await prisma.user.update({ where: { id: req.userId! }, data: { email: newEmail.toLowerCase() } });
    res.json({ message: 'Email updated' });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account
router.delete('/account', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!isValid) return res.status(401).json({ error: 'Password is incorrect' });

    await prisma.user.delete({ where: { id: req.userId! } });
    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
