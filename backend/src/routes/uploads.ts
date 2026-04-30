import express, { Response } from 'express'
import multer from 'multer'
import path from 'path'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i
    cb(null, allowed.test(file.originalname))
  },
})

router.post('/', authenticate, upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const isVideo = /\.(mp4|mov|webm)$/i.test(req.file.originalname)
  const url = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`
  res.json({ url, mediaType: isVideo ? 'video' : 'photo' })
})

export default router
