import { z } from 'zod/v4';

// ── Shared Validator Utilities ──────────────────────────────────

/**
 * Query string booleans arrive as strings. z.coerce.boolean() converts
 * any non-empty string to true (including "false"), which is wrong for
 * query params. This helper correctly maps "true"→true, "false"→false.
 *
 * Used across task and search validators.
 */
export const queryBoolean = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => v === true || v === 'true');
