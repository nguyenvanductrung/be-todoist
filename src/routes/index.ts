import { Router } from 'express';
import { projectRoutes } from './project.routes.js';
import { taskRoutes } from './task.routes.js';
import { viewRoutes } from './view.routes.js';
import { searchRoutes } from './search.routes.js';

const router = Router();

// ── Health Check ────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Feature Routes ──────────────────────────────────────────────
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/views', viewRoutes);
router.use('/search', searchRoutes);

export { router };
