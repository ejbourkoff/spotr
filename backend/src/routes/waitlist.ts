import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function addToLoops(entry: {
  name: string;
  email: string;
  school: string;
  sport: string;
  classYear?: string;
}) {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) return;

  const [firstName, ...rest] = entry.name.trim().split(' ');
  const lastName = rest.join(' ') || undefined;

  await fetch('https://app.loops.so/api/v1/contacts/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: entry.email,
      firstName,
      lastName,
      userGroup: 'waitlist',
      source: 'website',
      school: entry.school,
      sport: entry.sport,
      classYear: entry.classYear || '',
    }),
  });
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

  addToLoops({ name: name.trim(), email: email.trim().toLowerCase(), school: school.trim(), sport: sport.trim(), classYear: classYear?.trim() }).catch(
    (err) => console.error('[waitlist] loops error:', err)
  );

  res.json({ success: true, message: "You're on the list." });
});

export default router;
