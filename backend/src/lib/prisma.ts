import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

// Single shared client = one connection pool for the whole process. Route files
// must import this instead of constructing their own PrismaClient — each extra
// client opens its own pool (num_cpus * 2 + 1 connections each) and multiplies
// pressure on Postgres (Railway max_connections = 100).
//
// Explicit sizing: one service instance gets 10 pooled connections; queries
// beyond that queue for up to pool_timeout seconds. Leaves headroom for
// deploy overlap, migrations, and psql sessions.
function pooledUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw || /[?&]connection_limit=/.test(raw)) return raw;
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}connection_limit=10&pool_timeout=20`;
}

const url = pooledUrl();
const prisma = url
  ? new PrismaClient({ datasources: { db: { url } } })
  : new PrismaClient();

export default prisma;
