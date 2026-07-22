import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function addToBeehiiv(entry: {
  name: string;
  email: string;
  school: string;
  sport: string;
  classYear?: string;
}) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !publicationId) return;

  await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: entry.email,
      reactivate_existing: false,
      send_welcome_email: false,
      utm_source: 'website',
      custom_fields: [
        { name: 'Name', value: entry.name },
        { name: 'School', value: entry.school },
        { name: 'Sport', value: entry.sport },
        { name: 'Class Year', value: entry.classYear || '' },
      ],
    }),
  });
}

async function addToResend(entry: { name: string; email: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) return false;

  const [firstName, ...rest] = entry.name.split(/\s+/);
  await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: entry.email,
      first_name: firstName || '',
      last_name: rest.join(' '),
      unsubscribed: false,
    }),
  });
  return true;
}

router.post('/', async (req, res) => {
  const { name, email, school, sport, classYear } = req.body as {
    name?: string;
    email?: string;
    school?: string;
    sport?: string;
    classYear?: string;
  };

  if (!name?.trim() || !email?.trim() || !school?.trim() || !sport?.trim()) {
    res.status(400).json({ error: 'Name, email, school, and sport are required.' });
    return;
  }

  if (!EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  try {
    await prisma.waitlistEntry.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        school: school.trim(),
        sport: sport.trim(),
        classYear: classYear?.trim() || null,
      },
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'This email is already registered.' });
      return;
    }
    console.error('[waitlist] db error:', err);
    res.status(503).json({ error: 'Service unavailable. Please try again.' });
    return;
  }

  // Mailing list sync: Resend audience when configured, Beehiiv otherwise.
  addToResend({ name: name.trim(), email: email.trim().toLowerCase() })
    .then((synced) => {
      if (!synced) {
        return addToBeehiiv({ name: name.trim(), email: email.trim().toLowerCase(), school: school.trim(), sport: sport.trim(), classYear: classYear?.trim() });
      }
    })
    .catch((err) => console.error('[waitlist] mailing list sync error:', err));

  res.json({ success: true, message: "You're on the list." });
});

export default router;
