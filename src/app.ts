import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { requestLogger } from './middlewares/request-logger.js';

const app = express();

// ── CORS Configuration ──────────────────────────────────────────
// In development: CORS_ORIGIN defaults to "*" (allow all).
// In production: set CORS_ORIGIN to your frontend domain(s),
// e.g. "https://yourdomain.com" or comma-separated list.
const corsOrigin =
  env.CORS_ORIGIN === '*'
    ? '*'
    : env.CORS_ORIGIN.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

// ── Global Middlewares ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── API Routes ──────────────────────────────────────────────────
app.use('/api', router);

// ── Error Handling ──────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
