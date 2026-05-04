import express, { Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

const userInclude = {
  select: {
    id: true,
    avatarUrl: true,
    athleteProfile: { select: { name: true } },
    coachProfile:   { select: { name: true } },
    brandProfile:   { select: { name: true } },
  },
}

// GET /api/messages/conversations — list all unique conversations with last message + unread count
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!

    // Get all messages involving this user
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: userInclude,
        receiver: userInclude,
        sharedPost: { select: { id: true, text: true, mediaUrl: true, thumbnailUrl: true, mediaType: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by conversation partner
    const conversationMap = new Map<string, {
      partner: typeof messages[0]['sender'],
      lastMessage: typeof messages[0],
      unreadCount: number,
    }>()

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId
      const partner = msg.senderId === userId ? msg.receiver : msg.sender

      if (!conversationMap.has(partnerId)) {
        const unreadCount = messages.filter(
          m => m.senderId === partnerId && m.receiverId === userId && !m.readAt
        ).length
        conversationMap.set(partnerId, { partner, lastMessage: msg, unreadCount })
      }
    }

    const conversations = Array.from(conversationMap.values())

    res.json({ conversations })
  } catch (error) {
    console.error('Get conversations error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/messages/thread/:partnerId — full thread between current user and partner
router.get('/thread/:partnerId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { partnerId } = req.params
    const { limit = '50', before } = req.query

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
        ...(before ? { createdAt: { lt: new Date(before as string) } } : {}),
      },
      include: {
        sender: userInclude,
        receiver: userInclude,
        sharedPost: { select: { id: true, text: true, mediaUrl: true, thumbnailUrl: true, mediaType: true, author: { select: { id: true, avatarUrl: true, athleteProfile: { select: { name: true } }, coachProfile: { select: { name: true } }, brandProfile: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit as string),
    })

    // Mark incoming messages as read
    await prisma.message.updateMany({
      where: { senderId: partnerId, receiverId: userId, readAt: null },
      data: { readAt: new Date() },
    })

    res.json({ messages })
  } catch (error) {
    console.error('Get thread error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/messages — send a text message
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.userId!
    const { receiverId, body } = req.body

    if (!receiverId || !body) {
      return res.status(400).json({ error: 'receiverId and body are required' })
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
    if (!receiver) return res.status(404).json({ error: 'User not found' })
    if (receiver.id === senderId) return res.status(400).json({ error: 'Cannot message yourself' })

    const message = await prisma.message.create({
      data: { senderId, receiverId: receiver.id, body, type: 'text', subject: '' },
      include: {
        sender: userInclude,
        receiver: userInclude,
      },
    })
    res.status(201).json({ message })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/messages/share-post — share a post into a DM thread
router.post('/share-post', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.userId!
    const { receiverId, postId, body = '' } = req.body

    if (!receiverId || !postId) {
      return res.status(400).json({ error: 'receiverId and postId are required' })
    }

    const [receiver, post] = await Promise.all([
      prisma.user.findUnique({ where: { id: receiverId } }),
      prisma.post.findUnique({ where: { id: postId } }),
    ])
    if (!receiver) return res.status(404).json({ error: 'User not found' })
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (receiver.id === senderId) return res.status(400).json({ error: 'Cannot message yourself' })

    const message = await prisma.message.create({
      data: { senderId, receiverId: receiver.id, body, type: 'shared_post', sharedPostId: postId, subject: '' },
      include: {
        sender: userInclude,
        receiver: userInclude,
        sharedPost: { select: { id: true, text: true, mediaUrl: true, thumbnailUrl: true, mediaType: true } },
      },
    })
    res.status(201).json({ message })
  } catch (error) {
    console.error('Share post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/messages/:id/read — mark as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const message = await prisma.message.findUnique({ where: { id: req.params.id } })
    if (!message) return res.status(404).json({ error: 'Message not found' })
    if (message.receiverId !== userId) return res.status(403).json({ error: 'Forbidden' })

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    })
    res.json({ message: updated })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/messages/unread-count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.userId!, readAt: null },
    })
    res.json({ count })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
