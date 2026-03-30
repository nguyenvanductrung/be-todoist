import { projectRepository } from '../repositories/project.repository.js';
import { NotFoundError, ConflictError } from '../errors/app-error.js';
import type {
  ListProjectsQuery,
  CreateProjectInput,
  UpdateProjectInput,
} from '../validators/project.validator.js';

// ── Project Service ─────────────────────────────────────────────
// Business logic layer. Validates ownership, enforces uniqueness, delegates to repository.

export const projectService = {
  /**
   * List projects with pagination and sorting.
   * Returns data + pagination metadata for the controller.
   */
  async list(userId: string, query: ListProjectsQuery) {
    const { sortBy, sortOrder, page, limit } = query;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      projectRepository.findMany(userId, { sortBy, sortOrder, skip, take: limit }),
      projectRepository.count(userId),
    ]);

    return { projects, total, page, limit };
  },

  /**
   * Get a single project by ID.
   * Returns 404 if not found or not owned (prevents ID enumeration).
   */
  async getById(id: string, userId: string) {
    const project = await projectRepository.findById(id, userId);
    if (!project) {
      throw new NotFoundError('Project');
    }
    return project;
  },

  /**
   * Create a new project.
   * Enforces unique project name within the user's scope.
   */
  async create(userId: string, data: CreateProjectInput) {
    // Check for duplicate name
    const existing = await projectRepository.findByName(userId, data.name);
    if (existing) {
      throw new ConflictError(`A project named "${data.name}" already exists`);
    }

    return projectRepository.create(userId, data);
  },

  /**
   * Update a project.
   * If name is changing, checks for duplicate within the user's scope
   * (excluding the current project so renaming to the same name is allowed).
   */
  async update(id: string, userId: string, data: UpdateProjectInput) {
    // Check duplicate name if name is being changed
    if (data.name) {
      const duplicate = await projectRepository.findByName(userId, data.name, id);
      if (duplicate) {
        throw new ConflictError(`A project named "${data.name}" already exists`);
      }
    }

    const project = await projectRepository.update(id, userId, data);
    if (!project) {
      throw new NotFoundError('Project');
    }
    return project;
  },

  /**
   * Delete a project (cascades to all tasks).
   * Returns 404 if not found or not owned.
   */
  async delete(id: string, userId: string) {
    const project = await projectRepository.delete(id, userId);
    if (!project) {
      throw new NotFoundError('Project');
    }
  },
};
