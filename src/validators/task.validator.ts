import { z } from 'zod/v4';
import { queryBoolean } from './shared.js';

// ── Shared constants ────────────────────────────────────────────

const TASK_SORT_FIELDS = ['order', 'priority', 'dueDate', 'createdAt', 'title'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

// ── Param schemas ───────────────────────────────────────────────

export const taskIdParamSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

// ── Body schemas ────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  dueDate: z.iso.datetime().optional(),
  priority: z.number().int().min(1).max(4).optional(), // 1=Urgent 2=High 3=Medium 4=None
  projectId: z.string().min(1, 'Project ID is required'),
  parentId: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

/**
 * Schema for creating a sub-task via POST /tasks/:id/subtasks.
 * projectId and parentId are inherited from the parent task (URL param),
 * so the client does not need to send them.
 */
export const createSubTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  dueDate: z.iso.datetime().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  order: z.number().int().min(0).optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    dueDate: z.iso.datetime().nullable().optional(),
    priority: z.number().int().min(1).max(4).optional(),
    projectId: z.string().min(1).optional(),
    parentId: z.string().min(1).nullable().optional(),
    order: z.number().int().min(0).optional(),
    completed: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'At least one field must be provided for update' },
  );

// ── Query schemas ───────────────────────────────────────────────

export const listTasksQuerySchema = z.object({
  projectId: z.string().min(1).optional(),
  completed: queryBoolean.optional(),
  priority: z.coerce.number().int().min(1).max(4).optional(),
  parentOnly: queryBoolean.default(true),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  sortBy: z.enum(TASK_SORT_FIELDS).default('order'),
  sortOrder: z.enum(SORT_ORDERS).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Inferred types ──────────────────────────────────────────────

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateSubTaskInput = z.infer<typeof createSubTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
