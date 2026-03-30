import type { Request, Response, NextFunction } from 'express';

/**
 * Logs every incoming request with method, URL, status code, and duration.
 * Place before routes in the middleware chain.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';

    console.log(
      `${color}${req.method}${reset} ${req.originalUrl} ${color}${String(status)}${reset} ${String(duration)}ms`,
    );
  });

  next();
}
