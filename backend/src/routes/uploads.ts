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
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB to handle HEIC
  fileFilter: (_req, file, cb) => {
    // Accept any image MIME type — covers HEIC/HEIF from iOS camera roll
    cb(null, file.mimetype.startsWith('image/'))
  },
})

router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    console.error('Upload: no file — mimetype may be blocked or form field missing')
    return res.status(400).json({ error: 'No file received. Make sure you selected an image.' })
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary env vars missing:', { cloudName: !!cloudName, apiKey: !!apiKey, apiSecret: !!apiSecret })
    return res.status(500).json({ error: 'Image storage not configured on server' })
  }

  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'spotr', resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      stream.end(req.file!.buffer)
    })
    res.json({ url: result.secure_url, mediaType: 'photo' })
  } catch (err: any) {
    console.error('Cloudinary upload error:', err?.message || err)
    res.status(500).json({ error: `Upload failed: ${err?.message || 'unknown error'}` })
  }
})

export default router
