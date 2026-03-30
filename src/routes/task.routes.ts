import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { validate } from '../middlewares/validate.js';
import { userContext } from '../middlewares/user-context.js';
import {
  createTaskSchema,
  createSubTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
  listTasksQuerySchema,
} from '../validators/task.validator.js';

const taskRoutes = Router();

// All task routes require user context
taskRoutes.use(userContext);

// GET    /api/tasks?projectId=&completed=&priority=&sortBy=&...
taskRoutes.get(
  '/',
  validate({ query: listTasksQuerySchema }),
  taskController.list,
);

// POST   /api/tasks
taskRoutes.post(
  '/',
  validate({ body: createTaskSchema }),
  taskController.create,
);

// GET    /api/tasks/:id
taskRoutes.get(
  '/:id',
  validate({ params: taskIdParamSchema }),
  taskController.getById,
);

// PATCH  /api/tasks/:id
taskRoutes.patch(
  '/:id',
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  taskController.update,
);

// DELETE /api/tasks/:id
taskRoutes.delete(
  '/:id',
  validate({ params: taskIdParamSchema }),
  taskController.delete,
);

// PATCH  /api/tasks/:id/toggle
taskRoutes.patch(
  '/:id/toggle',
  validate({ params: taskIdParamSchema }),
  taskController.toggle,
);

// POST   /api/tasks/:id/subtasks  — create a sub-task under :id
taskRoutes.post(
  '/:id/subtasks',
  validate({ params: taskIdParamSchema, body: createSubTaskSchema }),
  taskController.createSubTask,
);

// GET    /api/tasks/:id/subtasks  — list sub-tasks of :id
taskRoutes.get(
  '/:id/subtasks',
  validate({ params: taskIdParamSchema }),
  taskController.listSubTasks,
);

export { taskRoutes };
