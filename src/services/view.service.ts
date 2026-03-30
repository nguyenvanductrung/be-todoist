import { taskRepository } from '../repositories/task.repository.js';
import { getStartOfDay, getStartOfNextDay, addDays } from '../utils/date.js';

// ── View Service ────────────────────────────────────────────────
// Computes timezone-aware UTC date boundaries and delegates to the
// task repository. Each method returns { tasks, meta } where meta
// describes the exact date window that was queried, so the frontend
// knows precisely what range it received.

export interface ViewMeta {
  tz: string;
  rangeStart: string | null; // null for overdue (open lower bound), ISO 8601 UTC otherwise
  rangeEnd: string | null; // null when unbounded
}

export const viewService = {
  /**
   * Tasks due "today" in the user's timezone.
   *
   * Interval: [startOfDay, startOfNextDay)  — half-open
   *
   * @example tz = "Asia/Ho_Chi_Minh" (UTC+7)
   *   At 2026-03-31 02:30 local time:
   *     rangeStart = 2026-03-30T17:00:00Z (midnight Mar 31 in +7)
   *     rangeEnd   = 2026-03-31T17:00:00Z (midnight Apr 1 in +7)
   */
  async today(userId: string, tz: string) {
    const rangeStart = getStartOfDay(tz);
    const rangeEnd = getStartOfNextDay(tz);

    const tasks = await taskRepository.findByDateRange(userId, {
      gte: rangeStart,
      lt: rangeEnd,
    });

    const meta: ViewMeta = {
      tz,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
    };

    return { tasks, meta };
  },

  /**
   * Tasks due in the next N days (excluding today).
   *
   * Interval: [startOfNextDay, startOfDay + (days+1) )
   *
   * Default: 7 days ahead. The range starts at the beginning of
   * "tomorrow" and ends at the beginning of day N+1 (exclusive).
   */
  async upcoming(userId: string, tz: string, days: number) {
    const rangeStart = getStartOfNextDay(tz);
    const rangeEnd = addDays(getStartOfDay(tz), days + 1);

    const tasks = await taskRepository.findByDateRange(userId, {
      gte: rangeStart,
      lt: rangeEnd,
    });

    const meta: ViewMeta = {
      tz,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
    };

    return { tasks, meta };
  },

  /**
   * Tasks that are overdue: due before the start of today and not completed.
   *
   * Interval: (-infinity, startOfDay)
   * The repository already filters for completed === false.
   */
  async overdue(userId: string, tz: string) {
    const rangeEnd = getStartOfDay(tz);

    const tasks = await taskRepository.findByDateRange(userId, {
      lt: rangeEnd,
    });

    const meta: ViewMeta = {
      tz,
      rangeStart: null, // open lower bound: (-infinity, rangeEnd)
      rangeEnd: rangeEnd.toISOString(),
    };

    return { tasks, meta };
  },
};
