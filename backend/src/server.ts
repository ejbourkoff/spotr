import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import athleteRoutes from './routes/athletes';
import postRoutes from './routes/posts';
import likeRoutes from './routes/likes';
import commentRoutes from './routes/comments';
import followRoutes from './routes/follows';
import saveRoutes from './routes/saves';
import coachRoutes from './routes/coaches';
import brandRoutes from './routes/brands';
import offerRoutes from './routes/offers';
import dealRoutes from './routes/deals';
import messageRoutes from './routes/messages';
import publicRoutes from './routes/public';
import uploadRoutes from './routes/uploads';
import muxRoutes from './routes/mux';
import notificationRoutes from './routes/notifications';
import connectionRoutes from './routes/connections';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import waitlistRoutes from './routes/waitlist';
import prisma from './lib/prisma';

dotenv.config();

// Fail-closed secret validation: a weak or missing JWT_SECRET lets anyone forge
// tokens for any user, so refuse to start rather than run insecurely.
const JWT_SECRET = process.env.JWT_SECRET || '';
const WEAK_SECRETS = ['super-secret', 'secret', 'changeme', 'password', 'jwt-secret', 'dev', 'test'];
const looksWeak =
  JWT_SECRET.length < 32 ||
  WEAK_SECRETS.some((w) => JWT_SECRET.toLowerCase().startsWith(w));
if (!JWT_SECRET || looksWeak) {
  console.error(
    'FATAL: JWT_SECRET is missing or weak. Set a strong random value ' +
      '(>=32 chars, e.g. `openssl rand -base64 48`) before starting the server.'
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://tranquil-exploration-production.up.railway.app',
  'https://thespotrapp.com',
  'https://www.thespotrapp.com',
  'https://spotrapp.co',
  'https://www.spotrapp.co',
  'https://spotr-production.up.railway.app',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '500kb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SPOTR API is running', v: '4a718d4' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', likeRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/users', followRoutes);
app.use('/api', saveRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/mux', muxRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/admin', express.static(path.join(process.cwd(), 'public/admin')));
app.get('/admin', (_req, res) => res.sendFile(path.join(process.cwd(), 'public/admin/index.html')));

const server = app.listen(PORT, () => {
  console.log(`🚀 SPOTR API server running on http://localhost:${PORT}`);
});

// Release pooled DB connections cleanly when Railway restarts/redeploys the
// service (SIGTERM), instead of leaving them to time out on the Postgres side.
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
