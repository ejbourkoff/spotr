import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many comments. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
