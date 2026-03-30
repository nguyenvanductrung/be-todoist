import type { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';
import { success, created, noContent, paginated } from '../utils/response.js';
import type {
  ListProjectsQuery,
  CreateProjectInput,
  UpdateProjectInput,
} from '../validators/project.validator.js';

// ── Project Controller ──────────────────────────────────────────
// HTTP layer. Parses request, calls service, sends response.
// No business logic here — that belongs in the service layer.

export const projectController = {
  /**
   * GET /api/projects?sortBy=&sortOrder=&page=&limit=
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.validatedQuery as unknown as ListProjectsQuery;
      const { projects, total, page, limit } = await projectService.list(req.userId, query);
      paginated(res, projects, { total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/projects/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getById(req.params['id']!, req.userId);
      success(res, project);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/projects
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.create(
        req.userId,
        req.body as CreateProjectInput,
      );
      created(res, project);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/projects/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.update(
        req.params['id']!,
        req.userId,
        req.body as UpdateProjectInput,
      );
      success(res, project);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/projects/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await projectService.delete(req.params['id']!, req.userId);
      noContent(res);
    } catch (err) {
      next(err);
    }
  },
};
