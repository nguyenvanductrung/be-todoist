import type { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service.js';
import { paginated } from '../utils/response.js';
import type { SearchQuery } from '../validators/search.validator.js';

// ── Search Controller ───────────────────────────────────────────
// Thin HTTP layer. Parses validated query, calls service, sends
// paginated response.

export const searchController = {
  /**
   * GET /api/search?q=keyword&projectId=&completed=&priority=&page=&limit=
   */
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.validatedQuery as unknown as SearchQuery;
      const { tasks, total, page, limit } = await searchService.search(req.userId, query);
      paginated(res, tasks, { total, page, limit });
    } catch (err) {
      next(err);
    }
  },
};
