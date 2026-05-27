import express, { Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';

const router = express.Router();

const userSelect = {
  id: true,
  email: true,
  role: true,
  avatarUrl: true,
  athleteProfile: { select: { id: true, name: true, sport: true, schoolTeam: true, position: true, classYear: true } },
  coachProfile:   { select: { id: true, name: true, organization: true, verified: true } },
  brandProfile:   { select: { id: true, name: true, organizationType: true } },
};

// Helper: get connection status between two users
async function getConnectionStatus(userAId: string, userBId: string) {
  const conn = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userAId, addresseeId: userBId },
        { requesterId: userBId, addresseeId: userAId },
      ],
    },
  });
  if (!conn) return { status: 'none', connectionId: null, iRequested: false };
  return {
    status: conn.status.toLowerCase(),
    connectionId: conn.id,
    iRequested: conn.requesterId === userAId,
  };
}

// POST /api/connections/:userId/request — send a connection request
router.post('/:userId/request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.userId!;
    const addresseeId = req.params.userId;

    if (requesterId === addresseeId) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee) return res.status(404).json({ error: 'User not found' });

    // Check for existing connection in either direction
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(400).json({ error: 'Already connected' });
      if (existing.status === 'PENDING') return res.status(400).json({ error: 'Connection request already pending' });
      // DECLINED — allow re-request by deleting and recreating
      await prisma.connection.delete({ where: { id: existing.id } });
    }

    const connection = await prisma.connection.create({
      data: { requesterId, addresseeId },
      include: { addressee: { select: userSelect } },
    });

    createNotification(addresseeId, requesterId, 'connection_request');

    res.status(201).json({ connection });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Request already sent' });
    console.error('Send connection request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/connections/:connectionId/accept — accept an incoming request
router.post('/:connectionId/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { connectionId } = req.params;

    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) return res.status(404).json({ error: 'Connection request not found' });
    if (connection.addresseeId !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (connection.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ACCEPTED' },
      include: { requester: { select: userSelect } },
    });

    createNotification(connection.requesterId, userId, 'connection_accepted');

    res.json({ connection: updated });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/connections/:connectionId/decline — decline an incoming request
router.post('/:connectionId/decline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { connectionId } = req.params;

    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) return res.status(404).json({ error: 'Connection request not found' });
    if (connection.addresseeId !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (connection.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });

    await prisma.connection.delete({ where: { id: connectionId } });

    res.json({ success: true });
  } catch (error) {
    console.error('Decline connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/connections/:userId — withdraw request or remove connection
router.delete('/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId!;
    const otherUserId = req.params.userId;

    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: currentUserId },
        ],
      },
    });

    if (!connection) return res.status(404).json({ error: 'Connection not found' });

    await prisma.connection.delete({ where: { id: connection.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/connections — my accepted connections
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = '30', offset = '0' } = req.query;

    const connections = await prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: userSelect },
        addressee: { select: userSelect },
      },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Return the other user in each connection
    const result = connections.map(c => ({
      connectionId: c.id,
      connectedAt: c.updatedAt,
      user: c.requesterId === userId ? c.addressee : c.requester,
    }));

    res.json({ connections: result, count: result.length });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/connections/pending — incoming pending requests
router.get('/pending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const pending = await prisma.connection.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: { requester: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests: pending, count: pending.length });
  } catch (error) {
    console.error('Get pending connections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/connections/status/:userId — connection status with a specific user
router.get('/status/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId!;
    const { userId } = req.params;
    const result = await getConnectionStatus(currentUserId, userId);
    res.json(result);
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/connections/accept-from/:requesterId — accept by requester's userId (for notification inline actions)
router.post('/accept-from/:requesterId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const addresseeId = req.userId!;
    const { requesterId } = req.params;

    const connection = await prisma.connection.findFirst({
      where: { requesterId, addresseeId, status: 'PENDING' },
    });
    if (!connection) return res.status(404).json({ error: 'Pending request not found' });

    const updated = await prisma.connection.update({
      where: { id: connection.id },
      data: { status: 'ACCEPTED' },
      include: { requester: { select: userSelect } },
    });

    createNotification(requesterId, addresseeId, 'connection_accepted');

    res.json({ connection: updated });
  } catch (error) {
    console.error('Accept connection (from requester) error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/connections/decline-from/:requesterId — decline by requester's userId
router.post('/decline-from/:requesterId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const addresseeId = req.userId!;
    const { requesterId } = req.params;

    const connection = await prisma.connection.findFirst({
      where: { requesterId, addresseeId, status: 'PENDING' },
    });
    if (!connection) return res.status(404).json({ error: 'Pending request not found' });

    await prisma.connection.delete({ where: { id: connection.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Decline connection (from requester) error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { getConnectionStatus };
export default router;
