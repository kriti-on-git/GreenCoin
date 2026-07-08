import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/error.middleware';
import pickupRoutes from './pickup/pickup.routes';
import { logger } from './utils/logger';

import collectionCenterRoutes from './pickup/collection-center.routes';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import { connectDB } from './config/db';

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
// Sets X-Content-Type-Options, X-Frame-Options, removes X-Powered-By, etc.
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
// Restrict cross-origin requests to the known frontend origin.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// ── Body parsing (size-limited to defend against large payload DoS) ───────────
app.use(express.json({ limit: '100kb' }));

// ── NoSQL injection sanitization ──────────────────────────────────────────────
// express-mongo-sanitize is incompatible with Express 5 (req.query is getter-only
// in Express 5's router; the library crashes trying to assign to it).
// Instead we apply a surgical inline sanitizer to req.body and req.params only.
// req.query safety is enforced by Zod schemas at every route boundary.
const stripMongoOperators = (obj: Record<string, unknown>): Record<string, unknown> => {
  if (typeof obj !== 'object' || obj === null) return obj;
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !key.startsWith('$') && !key.includes('.'))
      .map(([key, val]) => [
        key,
        typeof val === 'object' && val !== null
          ? stripMongoOperators(val as Record<string, unknown>)
          : val,
      ])
  );
};

app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = stripMongoOperators(req.body as Record<string, unknown>);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = stripMongoOperators(req.params as Record<string, unknown>) as Record<string, string>;
  }
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Rate limiters use an in-memory store — disable in test env to prevent the
// counter persisting between test cases and exhausting the window mid-suite.
const isTest = process.env.NODE_ENV === 'test';

// Strict limiter on auth endpoints (10 req / 15 min per IP) to slow brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? Infinity : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_ATTEMPTS',
    message: 'Too many attempts. Please try again later.',
  },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Generous general limiter (300 req / 15 min) across the rest of the API.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? Infinity : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1', generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/pickups', pickupRoutes);
app.use('/api/v1/collection-centers', collectionCenterRoutes);

// ── Error Handling Middleware (must be last) ───────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

export { app };

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}
