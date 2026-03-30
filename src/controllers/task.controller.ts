import type { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service.js';
import { success, created, noContent, paginated } from '../utils/response.js';
import type {
  ListTasksQuery,
  CreateTaskInput,
  CreateSubTaskInput,
  UpdateTaskInput,
} from '../validators/task.validator.js';

// ── Task Controller ─────────────────────────────────────────────
// HTTP layer. Parses request, calls service, sends response.
// No business logic here — that belongs in the service layer.

export const taskController = {
  /**
   * GET /api/tasks?projectId=&completed=&priority=&sortBy=&...
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.validatedQuery as unknown as ListTasksQuery;
      const { tasks, total, page, limit } = await taskService.list(req.userId, query);
      paginated(res, tasks, { total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/tasks/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.getById(req.params['id']!, req.userId);
      success(res, task);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/tasks
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.create(req.userId, req.body as CreateTaskInput);
      created(res, task);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/tasks/:id/subtasks
   */
  async createSubTask(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.createSubTask(
        req.userId,
        req.params['id']!,
        req.body as CreateSubTaskInput,
      );
      created(res, task);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/tasks/:id/subtasks
   */
  async listSubTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const subTasks = await taskService.listSubTasks(req.params['id']!, req.userId);
      success(res, subTasks);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/tasks/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.update(
        req.params['id']!,
        req.userId,
        req.body as UpdateTaskInput,
      );
      success(res, task);
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/tasks/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await taskService.delete(req.params['id']!, req.userId);
      noContent(res);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/tasks/:id/toggle
   */
  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.toggle(req.params['id']!, req.userId);
      success(res, task);
    } catch (err) {
      next(err);
    }
  },
};
