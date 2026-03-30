import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { NotFoundError, ValidationError } from '../errors/app-error.js';
import type {
  ListTasksQuery,
  CreateTaskInput,
  CreateSubTaskInput,
  UpdateTaskInput,
} from '../validators/task.validator.js';

// ── Task Service ────────────────────────────────────────────────
// Business logic: validates ownership, enforces nesting rules,
// manages completedAt timestamps, delegates to repository.

export const taskService = {
  // ── List ────────────────────────────────────────────────────

  /**
   * List tasks with filters, sorting, and pagination.
   * Returns paginated result with metadata.
   */
  async list(userId: string, query: ListTasksQuery) {
    const { sortBy, sortOrder, page, limit, ...filterFields } = query;
    const skip = (page - 1) * limit;

    const filters = {
      projectId: filterFields.projectId,
      completed: filterFields.completed,
      priority: filterFields.priority,
      parentOnly: filterFields.parentOnly,
      dueBefore: filterFields.dueBefore,
      dueAfter: filterFields.dueAfter,
    };

    const [tasks, total] = await Promise.all([
      taskRepository.findMany(userId, filters, { sortBy, sortOrder, skip, take: limit }),
      taskRepository.count(userId, filters),
    ]);

    return { tasks, total, page, limit };
  },

  // ── Get by ID ──────────────────────────────────────────────

  /**
   * Get a single task by ID with children and project info.
   */
  async getById(id: string, userId: string) {
    const task = await taskRepository.findById(id, userId);
    if (!task) {
      throw new NotFoundError('Task');
    }
    return task;
  },

  // ── Create ─────────────────────────────────────────────────

  /**
   * Create a new task.
   *
   * Business rules:
   * - projectId must exist and belong to the user
   * - parentId (if provided) must exist, belong to the user,
   *   NOT itself have a parent (max 1 level nesting), and be
   *   in the same project
   */
  async create(userId: string, data: CreateTaskInput) {
    // Validate project ownership
    const project = await projectRepository.findById(data.projectId, userId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Validate parent task if provided
    if (data.parentId) {
      await validateParentTask(data.parentId, userId, data.projectId);
    }

    return taskRepository.create({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority,
      order: data.order,
      userId,
      projectId: data.projectId,
      parentId: data.parentId,
    });
  },

  // ── Create Sub-task ────────────────────────────────────────

  /**
   * Create a sub-task under a parent task.
   * projectId and userId are inherited from the parent — the client
   * only needs to provide the sub-task's own fields.
   *
   * Business rules:
   * - Parent task must exist and belong to the user
   * - Parent must be a root task (cannot nest deeper than 1 level)
   */
  async createSubTask(userId: string, parentId: string, data: CreateSubTaskInput) {
    const parent = await taskRepository.findById(parentId, userId);
    if (!parent) {
      throw new NotFoundError('Parent task');
    }

    if (parent.parentId !== null) {
      throw new ValidationError(
        'Cannot create sub-task of a sub-task. Maximum nesting depth is 1 level.',
      );
    }

    return taskRepository.create({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority,
      order: data.order,
      userId,
      projectId: parent.projectId, // inherited from parent
      parentId,
    });
  },

  // ── List Sub-tasks ─────────────────────────────────────────

  /**
   * List direct children of a parent task.
   */
  async listSubTasks(parentId: string, userId: string) {
    // Verify parent exists and is owned
    const parent = await taskRepository.findById(parentId, userId);
    if (!parent) {
      throw new NotFoundError('Parent task');
    }

    return taskRepository.findChildren(parentId, userId);
  },

  // ── Update ─────────────────────────────────────────────────

  /**
   * Update a task.
   *
   * Business rules:
   * - If changing projectId, the new project must belong to the user
   * - If changing parentId:
   *   - New parent must exist, belong to user, and be a root task
   *   - Task with children cannot become a sub-task (would create depth > 1)
   *   - Task cannot be its own parent
   * - If setting completed, sync completedAt timestamp
   */
  async update(id: string, userId: string, data: UpdateTaskInput) {
    const existing = await taskRepository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Task');
    }

    // Validate new project if changing
    if (data.projectId && data.projectId !== existing.projectId) {
      const project = await projectRepository.findById(data.projectId, userId);
      if (!project) {
        throw new NotFoundError('Target project');
      }
    }

    // Validate parent change
    if (data.parentId !== undefined) {
      if (data.parentId !== null) {
        if (data.parentId === id) {
          throw new ValidationError('A task cannot be its own parent');
        }

        // If task has children, it cannot become a sub-task (depth > 1)
        if (existing._count.children > 0) {
          throw new ValidationError(
            'Cannot move a task with sub-tasks under another task. Remove sub-tasks first.',
          );
        }

        const effectiveProjectId = data.projectId ?? existing.projectId;
        await validateParentTask(data.parentId, userId, effectiveProjectId);
      }
    }

    // Build clean update payload
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData['title'] = data.title;
    if (data.description !== undefined) updateData['description'] = data.description;
    if (data.priority !== undefined) updateData['priority'] = data.priority;
    if (data.projectId !== undefined) updateData['projectId'] = data.projectId;
    if (data.parentId !== undefined) updateData['parentId'] = data.parentId;
    if (data.order !== undefined) updateData['order'] = data.order;

    // Handle dueDate: string → Date, null → null
    if (data.dueDate !== undefined) {
      updateData['dueDate'] = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Handle completed state: sync completedAt
    if (data.completed !== undefined) {
      updateData['completed'] = data.completed;
      if (data.completed && !existing.completed) {
        updateData['completedAt'] = new Date();
      } else if (!data.completed && existing.completed) {
        updateData['completedAt'] = null;
      }
    }

    return taskRepository.update(id, userId, updateData);
  },

  // ── Delete ─────────────────────────────────────────────────

  /**
   * Delete a task.
   * CASCADE in the database schema automatically deletes all children.
   * This is intentional: deleting a parent task removes the entire
   * sub-tree, matching Todoist behavior.
   */
  async delete(id: string, userId: string) {
    const task = await taskRepository.delete(id, userId);
    if (!task) {
      throw new NotFoundError('Task');
    }
  },

  // ── Toggle ─────────────────────────────────────────────────

  /**
   * Toggle a task's completed state.
   * Completing a parent does NOT auto-complete children (Todoist behavior).
   * Completing a sub-task does NOT auto-complete the parent.
   */
  async toggle(id: string, userId: string) {
    const existing = await taskRepository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Task');
    }

    const nowCompleted = !existing.completed;

    return taskRepository.update(id, userId, {
      completed: nowCompleted,
      completedAt: nowCompleted ? new Date() : null,
    });
  },
};

// ── Shared helpers ──────────────────────────────────────────────

/**
 * Validate that a parent task exists, is owned by the user, is a root
 * task (no parent itself), and belongs to the expected project.
 */
async function validateParentTask(
  parentId: string,
  userId: string,
  expectedProjectId: string,
): Promise<void> {
  const parent = await taskRepository.findById(parentId, userId);
  if (!parent) {
    throw new NotFoundError('Parent task');
  }
  if (parent.parentId !== null) {
    throw new ValidationError(
      'Cannot create sub-task of a sub-task. Maximum nesting depth is 1 level.',
    );
  }
  if (parent.projectId !== expectedProjectId) {
    throw new ValidationError('Parent task must be in the same project');
  }
}
