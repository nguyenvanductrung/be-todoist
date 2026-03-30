import { z } from 'zod/v4';
import { queryBoolean } from './shared.js';

// ── Search query schema ─────────────────────────────────────────

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query is required').max(200),
  projectId: z.string().min(1).optional(),
  completed: queryBoolean.optional(),
  priority: z.coerce.number().int().min(1).max(4).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ── Inferred types ──────────────────────────────────────────────

export type SearchQuery = z.infer<typeof searchQuerySchema>;
