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

// Poll upload status — returns playbackId once Mux finishes processing
router.get('/upload-status/:uploadId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { uploadId } = req.params
    const upload = await mux.video.uploads.retrieve(uploadId)

    if (upload.status === 'asset_created' && upload.asset_id) {
      const asset = await mux.video.assets.retrieve(upload.asset_id)
      const playbackId = asset.playback_ids?.[0]?.id ?? null
      res.json({ status: upload.status, playbackId })
    } else {
      res.json({ status: upload.status, playbackId: null })
    }
  } catch (error) {
    console.error('Mux upload status error:', error)
    res.status(500).json({ error: 'Failed to get upload status' })
  }
})

// Mux webhook — called when a video finishes processing
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify the webhook came from Mux before trusting its contents. Without this,
    // anyone who knows a post's muxUploadId can overwrite its video/thumbnail URLs.
    const secret = process.env.MUX_WEBHOOK_SECRET
    if (secret) {
      try {
        mux.webhooks.verifySignature(req.body, req.headers as Record<string, string>, secret)
      } catch {
        return res.status(401).json({ error: 'Invalid webhook signature' })
      }
    } else {
      console.warn('MUX_WEBHOOK_SECRET not set — webhook signature not verified')
    }

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
