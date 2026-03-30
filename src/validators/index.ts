// ── Validator barrel ────────────────────────────────────────────

export {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  listProjectsQuerySchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ListProjectsQuery,
} from './project.validator.js';

export {
  createTaskSchema,
  createSubTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
  listTasksQuerySchema,
  type CreateTaskInput,
  type CreateSubTaskInput,
  type UpdateTaskInput,
  type ListTasksQuery,
} from './task.validator.js';

export {
  todayQuerySchema,
  upcomingQuerySchema,
  overdueQuerySchema,
  type TodayQuery,
  type UpcomingQuery,
  type OverdueQuery,
} from './view.validator.js';

export {
  searchQuerySchema,
  type SearchQuery,
} from './search.validator.js';
