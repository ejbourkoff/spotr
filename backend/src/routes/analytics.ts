import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Start a session
router.post('/session/start', async (req: Request, res: Response) => {
  try {
    const { sessionKey, userId, appVersion, osVersion } = req.body;
    if (!sessionKey) { res.status(400).json({ error: 'sessionKey required' }); return; }

    await prisma.analyticsSession.upsert({
      where: { sessionKey },
      create: { sessionKey, userId: userId || null, appVersion, osVersion },
      update: { startedAt: new Date(), endedAt: null, durationMs: null },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('analytics session start:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// End a session
router.patch('/session/:key/end', async (req: Request, res: Response) => {
  try {
    const { durationMs, screenViews } = req.body;
    await prisma.analyticsSession.updateMany({
      where: { sessionKey: req.params.key },
      data: { endedAt: new Date(), durationMs: durationMs || null, screenViews: screenViews || 0 },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('analytics session end:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Batch ingest events
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) { res.json({ ok: true }); return; }

    const valid = events.filter((e: any) => e?.sessionKey && e?.event);
    if (valid.length === 0) { res.json({ ok: true }); return; }

    // Ensure sessions exist for all sessionKeys (upsert)
    const keys = [...new Set(valid.map((e: any) => e.sessionKey as string))];
    for (const key of keys) {
      const first = valid.find((e: any) => e.sessionKey === key);
      await prisma.analyticsSession.upsert({
        where: { sessionKey: key },
        create: { sessionKey: key, userId: first?.userId || null },
        update: {},
      });
    }

    await prisma.analyticsEvent.createMany({
      data: valid.map((e: any) => ({
        sessionKey: e.sessionKey,
        userId: e.userId || null,
        event: e.event,
        screen: e.screen || null,
        properties: e.properties || null,
        createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
      })),
      skipDuplicates: true,
    });

    res.json({ ok: true, count: valid.length });
  } catch (err) {
    console.error('analytics events:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
