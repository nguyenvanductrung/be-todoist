// ── Shared Backend Types ────────────────────────────────────────

/**
 * Standard API success response shape
 */
export interface ApiResponse<T> {
  status: 'success';
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Standard API error response shape
 */
export interface ApiErrorResponse {
  status: 'error';
  message: string;
  stack?: string;
}

/**
 * Pagination query params (parsed)
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Task priority levels (matches Todoist convention)
 * 1 = Urgent (P1), 2 = High (P2), 3 = Medium (P3), 4 = None (P4)
 */
export type TaskPriority = 1 | 2 | 3 | 4;

/**
 * User entity shape (API response — excludes passwordHash)
 */
export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project entity shape (API response)
 */
export interface ProjectDto {
  id: string;
  name: string;
  color: string;
  order: number;
  isFavorite: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task entity shape (API response)
 */
export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  completed: boolean;
  completedAt: string | null;
  order: number;
  userId: string;
  projectId: string;
  parentId: string | null;
  children?: TaskDto[];
  createdAt: string;
  updatedAt: string;
}
