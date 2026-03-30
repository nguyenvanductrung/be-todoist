import { prisma } from '../config/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CreateProjectInput, UpdateProjectInput } from '../validators/project.validator.js';

// ── Project Repository ──────────────────────────────────────────
// Pure data-access layer. No business logic. All queries scoped to userId.

/** Included on every read query so the frontend can show task counts. */
const WITH_TASK_COUNT = {
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectInclude;

export interface FindManyOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  skip: number;
  take: number;
}

export const projectRepository = {
  /**
   * Find projects belonging to a user with pagination and dynamic sorting.
   */
  async findMany(userId: string, options: FindManyOptions) {
    const { sortBy, sortOrder, skip, take } = options;

    return prisma.project.findMany({
      where: { userId },
      include: WITH_TASK_COUNT,
      orderBy: [{ [sortBy]: sortOrder }, { createdAt: 'asc' }],
      skip,
      take,
    });
  },

  /**
   * Count total projects for a user (for pagination metadata).
   */
  async count(userId: string) {
    return prisma.project.count({ where: { userId } });
  },

  /**
   * Find a single project by ID (scoped to user), including task count.
   */
  async findById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId },
      include: WITH_TASK_COUNT,
    });
  },

  /**
   * Find a project by exact name within a user's scope.
   * Used for uniqueness checks on create and update.
   *
   * @param excludeId  Exclude this project ID from the search (for update: allow renaming to the same name)
   */
  async findByName(userId: string, name: string, excludeId?: string) {
    return prisma.project.findFirst({
      where: {
        userId,
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true, name: true },
    });
  },

  /**
   * Create a new project for a user.
   */
  async create(userId: string, data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        name: data.name,
        color: data.color ?? '#808080',
        order: data.order ?? 0,
        isFavorite: data.isFavorite ?? false,
        userId,
      },
      include: WITH_TASK_COUNT,
    });
  },

  /**
   * Update a project. Returns null if not found or not owned by user.
   */
  async update(id: string, userId: string, data: UpdateProjectInput) {
    // Verify ownership first
    const existing = await prisma.project.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.project.update({
      where: { id },
      data,
      include: WITH_TASK_COUNT,
    });
  },

  /**
   * Delete a project. Returns null if not found or not owned by user.
   * Cascade will remove all tasks in the project.
   */
  async delete(id: string, userId: string) {
    const existing = await prisma.project.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.project.delete({ where: { id } });
  },
};
