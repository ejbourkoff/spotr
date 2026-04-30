import express, { Response } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Buffer storage so we can pipe to Cloudinary without writing to disk
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i
    cb(null, allowed.test(file.originalname))
  },
})

router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'spotr', resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      stream.end(req.file!.buffer)
    })
    res.json({ url: result.secure_url, mediaType: 'photo' })
  } catch (err) {
    console.error('Cloudinary upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

export default router
