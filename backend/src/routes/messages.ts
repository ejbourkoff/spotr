import express, { Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

const profileInclude = {
  select: {
    email: true,
    athleteProfile: { select: { name: true } },
    coachProfile: { select: { name: true } },
    brandProfile: { select: { name: true } },
  },
}

// GET /api/messages — inbox (received) + sent, sorted by newest
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ receiverId: userId }, { senderId: userId }],
      },
      include: {
        sender: profileInclude,
        receiver: profileInclude,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/messages — send a message by receiver email or receiverId
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.userId!
    const { receiverEmail, receiverId: receiverIdBody, subject, body } = req.body

    if ((!receiverEmail && !receiverIdBody) || !subject || !body) {
      return res.status(400).json({ error: 'receiverEmail or receiverId, subject, and body are required' })
    }

    const receiver = receiverIdBody
      ? await prisma.user.findUnique({ where: { id: receiverIdBody } })
      : await prisma.user.findUnique({ where: { email: receiverEmail } })
    if (!receiver) return res.status(404).json({ error: 'User not found' })
    if (receiver.id === senderId) return res.status(400).json({ error: 'Cannot message yourself' })

    const message = await prisma.message.create({
      data: { senderId, receiverId: receiver.id, subject, body },
      include: {
        sender: profileInclude,
        receiver: profileInclude,
      },
    })
    res.status(201).json({ message })
  } catch (error) {
    console.error('Send message error:', error)
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

export default router
