/**
 * Date utilities for timezone-aware view queries.
 *
 * ── Timezone Strategy ────────────────────────────────────────────
 *
 *  DB stores:          UTC DateTime (via Prisma @db.DateTime)
 *  Client sends:       ?tz=Asia/Ho_Chi_Minh (IANA timezone string)
 *  Server computes:    UTC boundaries for "today", "upcoming", "overdue"
 *                      relative to that timezone using Intl.DateTimeFormat.
 *  Date comparisons:   Always half-open intervals [start, end) using
 *                      Prisma { gte, lt } — never inclusive upper bounds.
 *  Frontend renders:   Converts UTC → local display using the same tz.
 *
 * ── Why half-open intervals? ─────────────────────────────────────
 *
 *  Using [gte: startOfDay, lt: startOfNextDay) avoids the classic
 *  off-by-one-millisecond problem with inclusive upper bounds like
 *  23:59:59.999, and cleanly chains adjacent windows without overlap.
 *
 * ── How timezone conversion works ────────────────────────────────
 *
 *  1. Use Intl.DateTimeFormat.formatToParts() to extract the local
 *     year/month/day in the target timezone at the current instant.
 *  2. Build a UTC timestamp for midnight of that date using Date.UTC().
 *  3. Compute the timezone offset by comparing the UTC-formatted and
 *     TZ-formatted representations of midnight, then adjust.
 *
 *  This approach is DST-safe because we compute the offset AT the
 *  specific instant (midnight) rather than using a static offset.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Public API ──────────────────────────────────────────────────

/**
 * Get the UTC instant corresponding to the start of "today" (00:00:00.000)
 * in the given IANA timezone.
 *
 * @param tz IANA timezone string, e.g. "Asia/Ho_Chi_Minh", "America/New_York"
 * @returns  Date representing midnight-today in `tz`, expressed as UTC
 *
 * @example
 *   // If it's 2026-03-31 02:30 in Ho Chi Minh (UTC+7),
 *   // getStartOfDay("Asia/Ho_Chi_Minh") returns 2026-03-30T17:00:00.000Z
 *   // because midnight Mar 31 in UTC+7 = 17:00 Mar 30 UTC.
 */
export function getStartOfDay(tz = 'UTC'): Date {
  const now = new Date();

  // Step 1: Extract local date parts in the target timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const day = Number(parts.find((p) => p.type === 'day')!.value);

  // Step 2: Build a UTC timestamp for this date at midnight
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Step 3: Compute the timezone offset at this specific instant
  // by comparing UTC and TZ representations of the same moment.
  const offsetMs = getTimezoneOffsetMs(utcGuess, tz);

  // Midnight in the target timezone, expressed in UTC
  return new Date(utcGuess.getTime() - offsetMs);
}

/**
 * Get the UTC instant corresponding to the start of "tomorrow" (00:00:00.000)
 * in the given IANA timezone.
 *
 * Used as the exclusive upper bound (`lt`) for "today" queries:
 *   WHERE dueDate >= startOfDay AND dueDate < startOfNextDay
 */
export function getStartOfNextDay(tz = 'UTC'): Date {
  const start = getStartOfDay(tz);
  return new Date(start.getTime() + MS_PER_DAY);
}

/**
 * Add (or subtract) days from a Date.
 *
 * @param date Base date
 * @param days Number of days to add (negative to subtract)
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Check whether a string is a valid IANA timezone identifier.
 *
 * Uses Intl.DateTimeFormat which throws RangeError for invalid timezones.
 * This is the standard, zero-dependency way to validate timezone strings
 * in any modern JS runtime.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ── Internal helpers ────────────────────────────────────────────

/**
 * Compute the UTC offset (in ms) for a given timezone at a specific instant.
 *
 * Returns a positive number for timezones east of UTC (e.g. +7h for ICT)
 * and a negative number for timezones west of UTC (e.g. -5h for EST).
 *
 * Strategy: format the same instant as both UTC and the target timezone,
 * parse both, and compute the difference. The Intl API handles DST
 * transitions automatically because we compute the offset for the
 * specific instant rather than using a static offset.
 */
function getTimezoneOffsetMs(date: Date, tz: string): number {
  // Format the instant in both UTC and target timezone
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: tz });

  // Parse both strings back to timestamps and compute the diff
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}
