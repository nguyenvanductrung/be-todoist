import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { PrismaClientKnownRequestError } from '../../generated/prisma/internal/prismaNamespace.js';
import { env } from '../config/env.js';
import type { ApiErrorResponse } from '../types/index.js';

/**
 * Centralized error handler.
 *
 * Handles:
 * - AppError (and subclasses)      → returns appropriate status + message
 * - PrismaClientKnownRequestError  → maps common Prisma codes to HTTP status
 * - Unknown errors                 → 500 Internal Server Error
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── AppError (operational) ──────────────────────────────────────
  if (err instanceof AppError) {
    const response: ApiErrorResponse = { status: 'error', message: err.message };
    if (env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }
    res.status(err.statusCode).json(response);
    return;
  }

  // ── Prisma known request errors ─────────────────────────────────
  if (err instanceof PrismaClientKnownRequestError) {
    const prismaResponse = handlePrismaError(err);
    if (env.NODE_ENV === 'development') {
      prismaResponse.stack = err.stack;
    }
    res.status(prismaResponse._statusCode).json({
      status: prismaResponse.status,
      message: prismaResponse.message,
      ...(env.NODE_ENV === 'development' && { stack: prismaResponse.stack }),
    });
    return;
  }

  // ── Unknown / unexpected errors ─────────────────────────────────
  console.error('[UNEXPECTED ERROR]', err);

  const response: ApiErrorResponse = {
    status: 'error',
    message: 'Internal Server Error',
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(500).json(response);
}

// ── Prisma error mapping ────────────────────────────────────────────

interface PrismaErrorInfo {
  status: 'error';
  message: string;
  _statusCode: number;
  stack?: string;
}

function handlePrismaError(err: InstanceType<typeof PrismaClientKnownRequestError>): PrismaErrorInfo {
  switch (err.code) {
    // Unique constraint violation
    case 'P2002': {
      const target = (err.meta?.['target'] as string[] | undefined)?.join(', ') ?? 'unknown field';
      return {
        status: 'error',
        message: `A record with this ${target} already exists`,
        _statusCode: 409,
      };
    }

    // Foreign key constraint violation
    case 'P2003': {
      const field = (err.meta?.['field_name'] as string) ?? 'related record';
      return {
        status: 'error',
        message: `Related ${field} not found`,
        _statusCode: 400,
      };
    }

    // Record not found (update/delete)
    case 'P2025':
      return {
        status: 'error',
        message: (err.meta?.['cause'] as string) ?? 'Record not found',
        _statusCode: 404,
      };

    default:
      return {
        status: 'error',
        message: 'Database error',
        _statusCode: 500,
      };
  }
}
