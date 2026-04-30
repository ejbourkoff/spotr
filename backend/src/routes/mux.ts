import express, { Response } from 'express'
import Mux from '@mux/mux-node'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

// Get a direct upload URL (frontend uploads straight to Mux)
router.post('/upload-url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const upload = await mux.video.uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: req.userId!,
      },
    })
    res.json({ uploadUrl: upload.url, uploadId: upload.id })
  } catch (error) {
    console.error('Mux upload URL error:', error)
    res.status(500).json({ error: 'Failed to create upload URL' })
  }
})

// Mux webhook — called when a video finishes processing
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString())

    if (event.type === 'video.asset.ready') {
      const uploadId = event.data.upload_id
      const assetId = event.data.id
      const playbackId = event.data.playback_ids?.[0]?.id

      if (uploadId && playbackId) {
        await prisma.post.updateMany({
          where: { muxUploadId: uploadId },
          data: {
            muxAssetId: assetId,
            muxPlaybackId: playbackId,
            mediaUrl: `https://stream.mux.com/${playbackId}.m3u8`,
            thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
          },
        })
      }
    }
  } catch (error) {
    console.error('Mux webhook error:', error)
  }
  res.status(200).json({ received: true })
})

export default router
