import { z } from 'zod/v4';
import { isValidTimezone } from '../utils/date.js';

// ── Shared schemas ──────────────────────────────────────────────

/**
 * IANA timezone string validated at the schema level.
 * Rejects invalid values with a clear 400 instead of letting them
 * propagate as a 500 RangeError inside the date utils.
 */
const timezoneSchema = z
  .string()
  .default('UTC')
  .refine(isValidTimezone, {
    message: 'Invalid IANA timezone. Examples: "UTC", "Asia/Ho_Chi_Minh", "America/New_York"',
  });

// ── View query schemas ──────────────────────────────────────────

export const todayQuerySchema = z.object({
  tz: timezoneSchema,
});

export const upcomingQuerySchema = z.object({
  tz: timezoneSchema,
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export const overdueQuerySchema = z.object({
  tz: timezoneSchema,
});

// ── Inferred types ──────────────────────────────────────────────

export type TodayQuery = z.infer<typeof todayQuerySchema>;
export type UpcomingQuery = z.infer<typeof upcomingQuerySchema>;
export type OverdueQuery = z.infer<typeof overdueQuerySchema>;
