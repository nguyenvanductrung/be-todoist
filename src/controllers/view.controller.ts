import type { Request, Response, NextFunction } from 'express';
import { viewService } from '../services/view.service.js';
import { success } from '../utils/response.js';
import type { TodayQuery, UpcomingQuery, OverdueQuery } from '../validators/view.validator.js';

// ── View Controller ─────────────────────────────────────────────
// Thin HTTP layer for Today / Upcoming / Overdue views.
// Each endpoint returns { tasks, meta } where meta describes the
// exact UTC date window that was queried.

export const viewController = {
  /**
   * GET /api/views/today?tz=Asia/Ho_Chi_Minh
   */
  async today(req: Request, res: Response, next: NextFunction) {
    try {
      const { tz } = req.validatedQuery as unknown as TodayQuery;
      const result = await viewService.today(req.userId, tz);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/views/upcoming?tz=Asia/Ho_Chi_Minh&days=7
   */
  async upcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const { tz, days } = req.validatedQuery as unknown as UpcomingQuery;
      const result = await viewService.upcoming(req.userId, tz, days);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/views/overdue?tz=Asia/Ho_Chi_Minh
   */
  async overdue(req: Request, res: Response, next: NextFunction) {
    try {
      const { tz } = req.validatedQuery as unknown as OverdueQuery;
      const result = await viewService.overdue(req.userId, tz);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },
};
