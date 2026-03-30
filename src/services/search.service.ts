import { taskRepository } from '../repositories/task.repository.js';
import type { SearchQuery } from '../validators/search.validator.js';

// ── Search Service ──────────────────────────────────────────────
// Dedicated service for task search. Accepts the fully validated
// query from the controller, computes pagination, and delegates
// to the repository for database queries.

export const searchService = {
  /**
   * Search tasks by title across all of a user's projects.
   *
   * Returns paginated results with total count. The query string
   * is already trimmed and validated by Zod at the controller level.
   *
   * @param userId  The authenticated user's ID
   * @param query   Validated search query with filters and pagination
   * @returns       Paginated search results
   */
  async search(userId: string, query: SearchQuery) {
    const { q, page, limit, ...filterFields } = query;
    const skip = (page - 1) * limit;

    const filters = {
      projectId: filterFields.projectId,
      completed: filterFields.completed,
      priority: filterFields.priority,
    };

    const [tasks, total] = await Promise.all([
      taskRepository.search(userId, q, filters, { skip, take: limit }),
      taskRepository.searchCount(userId, q, filters),
    ]);

    return { tasks, total, page, limit };
  },
};
