import { prisma } from '../config/database.js';
import type { Prisma } from '../../generated/prisma/client.js';

// ── Task Repository ─────────────────────────────────────────────
// Pure data-access layer. All queries scoped to userId.
// No business logic here — that belongs in the service layer.

// ── Shared includes ─────────────────────────────────────────────

/**
 * Include children (sorted) and a count of children on every read query.
 * This lets the frontend render a task tree and show sub-task badges
 * without extra requests.
 */
const TASK_INCLUDE = {
  children: {
    orderBy: [
      { order: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
    include: {
      _count: { select: { children: true } },
    },
  },
  _count: { select: { children: true } },
} satisfies Prisma.TaskInclude;

/**
 * Detail view includes project metadata alongside children.
 */
const TASK_DETAIL_INCLUDE = {
  ...TASK_INCLUDE,
  project: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TaskInclude;

/**
 * View queries (Today / Upcoming / Overdue) include project info so the
 * frontend can render grouped lists with project name and color badge.
 */
const TASK_VIEW_INCLUDE = {
  ...TASK_INCLUDE,
  project: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TaskInclude;

/**
 * Search results include project info and parent title so the frontend
 * can display "sub-task of X" context and project badges in results.
 */
const TASK_SEARCH_INCLUDE = {
  ...TASK_INCLUDE,
  project: { select: { id: true, name: true, color: true } },
  parent: { select: { id: true, title: true } },
} satisfies Prisma.TaskInclude;

// ── Types ───────────────────────────────────────────────────────

export interface TaskFilters {
  projectId?: string;
  completed?: boolean;
  priority?: number;
  parentOnly?: boolean;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface TaskFindManyOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  skip: number;
  take: number;
}

/**
 * Half-open date interval: [gte, lt).
 * Always use gte + lt for consistent boundary handling.
 */
export interface DateRange {
  gte?: Date;
  lt?: Date;
}

export interface SearchFilters {
  projectId?: string;
  completed?: boolean;
  priority?: number;
}

// ── Repository ──────────────────────────────────────────────────

export const taskRepository = {
  /**
   * Find tasks with filters, pagination, sorting, and child counts.
   * By default only returns root tasks (parentId === null); set
   * `parentOnly: false` to return all tasks flat.
   */
  async findMany(
    userId: string,
    filters: TaskFilters = {},
    options: TaskFindManyOptions,
  ) {
    const where = buildWhereClause(userId, filters);

    return prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ [options.sortBy]: options.sortOrder }, { createdAt: 'asc' }],
      skip: options.skip,
      take: options.take,
    });
  },

  /**
   * Count tasks matching filters (for pagination metadata).
   */
  async count(userId: string, filters: TaskFilters = {}) {
    const where = buildWhereClause(userId, filters);
    return prisma.task.count({ where });
  },

  /**
   * Find a single task by ID (scoped to user).
   * Includes children, child count, and project info for the detail view.
   */
  async findById(id: string, userId: string) {
    return prisma.task.findFirst({
      where: { id, userId },
      include: TASK_DETAIL_INCLUDE,
    });
  },

  /**
   * Find direct children of a parent task.
   * Used by GET /tasks/:id/subtasks.
   */
  async findChildren(parentId: string, userId: string) {
    return prisma.task.findMany({
      where: { parentId, userId },
      include: {
        _count: { select: { children: true } },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  },

  /**
   * Create a new task.
   */
  async create(data: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority?: number;
    order?: number;
    userId: string;
    projectId: string;
    parentId?: string;
  }) {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
        priority: data.priority ?? 4,
        order: data.order ?? 0,
        userId: data.userId,
        projectId: data.projectId,
        parentId: data.parentId ?? null,
      },
      include: TASK_DETAIL_INCLUDE,
    });
  },

  /**
   * Update a task. Returns null if not found or not owned by user.
   */
  async update(id: string, userId: string, data: Prisma.TaskUpdateInput) {
    const existing = await prisma.task.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.task.update({
      where: { id },
      data,
      include: TASK_DETAIL_INCLUDE,
    });
  },

  /**
   * Delete a task. Returns null if not found or not owned by user.
   * CASCADE in the schema automatically deletes all children.
   */
  async delete(id: string, userId: string) {
    const existing = await prisma.task.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.task.delete({ where: { id } });
  },

  // ── View / Search queries (used by other modules) ───────────

  /**
   * Find tasks by date range (for Today / Upcoming / Overdue views).
   *
   * - Only returns incomplete root tasks (parentId === null, completed === false).
   * - Explicitly filters out tasks with NULL dueDate to prevent them
   *   from leaking into time-based views.
   * - Uses half-open intervals [gte, lt) for correct boundary handling.
   * - Includes project info (name, color) for frontend rendering.
   */
  async findByDateRange(userId: string, dateRange: DateRange) {
    return prisma.task.findMany({
      where: {
        userId,
        completed: false,
        parentId: null,
        dueDate: {
          not: null, // Exclude tasks with no deadline
          ...dateRange,
        },
      },
      include: TASK_VIEW_INCLUDE,
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }, { order: 'asc' }],
    });
  },

  /**
   * Search tasks by title (case-insensitive ILIKE / contains).
   *
   * Includes project info and parent title for rich search results.
   * Sorted by relevance: incomplete first, then higher priority, then newest.
   *
   * ── Performance note ──────────────────────────────────────────
   * Prisma's `contains` + `insensitive` generates ILIKE '%term%', which
   * cannot use the existing B-tree index on `title`. For production at
   * scale, add a pg_trgm GIN index via a raw SQL migration:
   *
   *   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   *   CREATE INDEX tasks_title_trgm_idx ON tasks USING GIN (title gin_trgm_ops);
   *
   * This enables PostgreSQL to use the index for ILIKE patterns.
   */
  async search(
    userId: string,
    query: string,
    filters: SearchFilters = {},
    pagination?: { skip: number; take: number },
  ) {
    const where = buildSearchWhereClause(userId, query, filters);

    return prisma.task.findMany({
      where,
      include: TASK_SEARCH_INCLUDE,
      orderBy: [
        { completed: 'asc' },   // Incomplete tasks first
        { priority: 'asc' },    // Urgent (1) before None (4)
        { createdAt: 'desc' },  // Newest first within same priority
      ],
      ...(pagination && { skip: pagination.skip, take: pagination.take }),
    });
  },

  /**
   * Count tasks matching a search query (for pagination metadata).
   */
  async searchCount(
    userId: string,
    query: string,
    filters: SearchFilters = {},
  ) {
    const where = buildSearchWhereClause(userId, query, filters);
    return prisma.task.count({ where });
  },
};

// ── Helpers ─────────────────────────────────────────────────────

function buildWhereClause(
  userId: string,
  filters: TaskFilters,
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { userId };

  // Parent filter: default is root-only (parentId === null)
  if (filters.parentOnly !== false) {
    where.parentId = null;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.completed !== undefined) {
    where.completed = filters.completed;
  }

  if (filters.priority !== undefined) {
    where.priority = filters.priority;
  }

  // Date-range filters
  if (filters.dueAfter || filters.dueBefore) {
    where.dueDate = {};
    if (filters.dueAfter) {
      (where.dueDate as Record<string, Date>).gte = filters.dueAfter;
    }
    if (filters.dueBefore) {
      (where.dueDate as Record<string, Date>).lte = filters.dueBefore;
    }
  }

  return where;
}

/**
 * Build WHERE clause for search queries.
 * Always scoped to userId + title contains (case-insensitive).
 * Optional filters for projectId, completed, priority.
 */
function buildSearchWhereClause(
  userId: string,
  query: string,
  filters: SearchFilters,
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    userId,
    title: { contains: query, mode: 'insensitive' },
  };

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.completed !== undefined) {
    where.completed = filters.completed;
  }

  if (filters.priority !== undefined) {
    where.priority = filters.priority;
  }

  return where;
}
