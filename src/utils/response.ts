import type { Response } from 'express';
import type { ApiResponse } from '../types/index.js';

/**
 * Send a standardized success response.
 *
 * @param res    Express response object
 * @param data   Response payload
 * @param status HTTP status code (default 200)
 */
export function success<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { status: 'success', data };
  res.status(status).json(body);
}

/**
 * Send a standardized paginated success response.
 */
export function paginated<T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; limit: number },
): void {
  const body: ApiResponse<T[]> = { status: 'success', data, meta };
  res.status(200).json(body);
}

/**
 * Send a 201 Created response.
 */
export function created<T>(res: Response, data: T): void {
  success(res, data, 201);
}

/**
 * Send a 204 No Content response (for deletes).
 */
export function noContent(res: Response): void {
  res.status(204).send();
}
