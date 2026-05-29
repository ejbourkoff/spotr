import express, { Response } from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (Supabase Storage limit per file)
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')
    cb(null, ok)
  },
})

router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received. Make sure you selected an image.' })
  }

  const isVideo = req.file.mimetype.startsWith('video/')
  const bucket = req.query.bucket === 'avatars' ? 'avatars' : 'post-images'
  const ext = req.file.originalname?.split('.').pop() || (isVideo ? 'mp4' : 'jpg')
  const filename = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    })

  if (error) {
    console.error('Supabase upload error:', error.message)
    return res.status(500).json({ error: `Upload failed: ${error.message}` })
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filename)

  res.json({ url: publicUrl, mediaType: isVideo ? 'video' : 'photo' })
})

export default router
