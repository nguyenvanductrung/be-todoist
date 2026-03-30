import { Router } from 'express';
import { viewController } from '../controllers/view.controller.js';
import { validate } from '../middlewares/validate.js';
import { userContext } from '../middlewares/user-context.js';
import {
  todayQuerySchema,
  upcomingQuerySchema,
  overdueQuerySchema,
} from '../validators/view.validator.js';

const viewRoutes = Router();

// All view routes require user context
viewRoutes.use(userContext);

// GET /api/views/today
viewRoutes.get(
  '/today',
  validate({ query: todayQuerySchema }),
  viewController.today,
);

// GET /api/views/upcoming
viewRoutes.get(
  '/upcoming',
  validate({ query: upcomingQuerySchema }),
  viewController.upcoming,
);

// GET /api/views/overdue
viewRoutes.get(
  '/overdue',
  validate({ query: overdueQuerySchema }),
  viewController.overdue,
);

export { viewRoutes };
