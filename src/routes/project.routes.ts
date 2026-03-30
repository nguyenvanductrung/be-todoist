import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { validate } from '../middlewares/validate.js';
import { userContext } from '../middlewares/user-context.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  listProjectsQuerySchema,
} from '../validators/project.validator.js';

const projectRoutes = Router();

// All project routes require user context
projectRoutes.use(userContext);

// GET    /api/projects?sortBy=&sortOrder=&page=&limit=
projectRoutes.get(
  '/',
  validate({ query: listProjectsQuerySchema }),
  projectController.list,
);

// POST   /api/projects
projectRoutes.post(
  '/',
  validate({ body: createProjectSchema }),
  projectController.create,
);

// GET    /api/projects/:id
projectRoutes.get(
  '/:id',
  validate({ params: projectIdParamSchema }),
  projectController.getById,
);

// PATCH  /api/projects/:id
projectRoutes.patch(
  '/:id',
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  projectController.update,
);

// DELETE /api/projects/:id
projectRoutes.delete(
  '/:id',
  validate({ params: projectIdParamSchema }),
  projectController.delete,
);

export { projectRoutes };
