import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod/v4';
import { z } from 'zod/v4';
import { AppError } from '../errors/app-error.js';

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Generic Zod validation middleware.
 *
 * Validates `req.body`, `req.query`, and/or `req.params` against the
 * provided schemas. On success the validated (and coerced) data replaces
 * the original values. On failure a 400 AppError with details is thrown.
 *
 * Note: In Express 5, `req.query` is a read-only getter. Transformed query
 * data (with Zod defaults/coercions) is stored in `req.validatedQuery`.
 * Controllers should read query params from `req.validatedQuery`.
 *
 * Usage:
 *   router.post('/', validate({ body: createProjectSchema }), controller.create);
 *   router.get('/',  validate({ query: listSchema }),          controller.list);
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data as Record<string, unknown>;
      } else {
        const formatted = z.prettifyError(result.error);
        errors.push(`Body: ${formatted}`);
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        // Express 5: req.query is read-only, store transformed data separately
        req.validatedQuery = result.data as Record<string, unknown>;
      } else {
        const formatted = z.prettifyError(result.error);
        errors.push(`Query: ${formatted}`);
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        req.params = result.data as Record<string, string>;
      } else {
        const formatted = z.prettifyError(result.error);
        errors.push(`Params: ${formatted}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(errors.join('\n'), 400);
    }

    next();
  };
}
