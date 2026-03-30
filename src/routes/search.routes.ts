import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { validate } from '../middlewares/validate.js';
import { userContext } from '../middlewares/user-context.js';
import { searchQuerySchema } from '../validators/search.validator.js';

const searchRoutes = Router();

// All search routes require user context
searchRoutes.use(userContext);

// GET /api/search?q=&projectId=
searchRoutes.get(
  '/',
  validate({ query: searchQuerySchema }),
  searchController.search,
);

export { searchRoutes };
