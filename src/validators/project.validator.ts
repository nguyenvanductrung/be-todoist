import { z } from 'zod/v4';

// ── Shared field constraints ────────────────────────────────────

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const PROJECT_SORT_FIELDS = ['name', 'order', 'createdAt', 'updatedAt'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

// ── Param schemas ───────────────────────────────────────────────

export const projectIdParamSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
});

// ── Query schemas ───────────────────────────────────────────────

export const listProjectsQuerySchema = z.object({
  sortBy: z.enum(PROJECT_SORT_FIELDS).default('order'),
  sortOrder: z.enum(SORT_ORDERS).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Body schemas ────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  color: z
    .string()
    .regex(HEX_COLOR, 'Color must be a valid hex (e.g. #FF5733)')
    .optional(),
  order: z.number().int().min(0).optional(),
  isFavorite: z.boolean().optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(255).optional(),
    color: z
      .string()
      .regex(HEX_COLOR, 'Color must be a valid hex (e.g. #FF5733)')
      .optional(),
    order: z.number().int().min(0).optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'At least one field must be provided for update' },
  );

// ── Inferred types ──────────────────────────────────────────────

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
