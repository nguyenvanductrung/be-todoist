import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

/**
 * User context middleware.
 *
 * Reads `X-User-Id` header and sets `req.userId`.
 * - In development: if header is missing, auto-resolves to the first user in DB
 *   (the demo user from seed). This allows testing without auth.
 * - In production: returns 401 if header is missing.
 *
 * When auth (JWT) is implemented later, replace this middleware.
 */

let cachedDefaultUserId: string | null = null;

export async function userContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const headerUserId = req.headers['x-user-id'];

  if (typeof headerUserId === 'string' && headerUserId.length > 0) {
    req.userId = headerUserId;
    next();
    return;
  }

  // No header provided
  if (env.NODE_ENV === 'production') {
    throw new AppError('Authentication required', 401);
  }

  // Development: auto-resolve to first user
  if (!cachedDefaultUserId) {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      throw new AppError('No users in database. Run `npm run db:seed` first.', 500);
    }
    cachedDefaultUserId = user.id;
  }

  req.userId = cachedDefaultUserId;
  next();
}
