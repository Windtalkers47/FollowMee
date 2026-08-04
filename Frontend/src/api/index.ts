// Export all API services
// Note: Using named exports instead of wildcard to avoid 'User' type conflict
// between user.api.ts and task.api.ts
export * from './auth.api';
export * from './customer.api';
export * from './notification.api';
export type { OrganizationRole, TaskScope, TaskPriority } from '../types/organization.types';

// Explicitly export User from user.api only (task.api has its own User type)
export { userApi, type User } from './user.api';

// Export task API types and functions explicitly (has its own User type)
export { 
  taskApi, 
  commentApi, 
  likeApi,
  bulkActionApi,
  type Task,
  type TaskImage,
  type TaskComment,
  type TaskCommentReaction,
  type TaskLike,
  type TaskLikeSummary,
  type CreateTaskData,
  type UpdateTaskData,
  type TaskQueryParams,
  type TaskListResponse,
  type CreateCommentData,
  type UpdateCommentData,
  type MarkTaskDoneData,
  type MarkTaskDoneResponse,
  type UserRank,
  type CreateLikeData,
  type BulkUpdateStatusData,
  type BulkDeleteData,
  type BulkAssignData,
  type BulkActionResult,
  type PrioritySuggestion,
  type SuggestionAction,
  type PrioritySummaryResponse,
} from './task.api';

// Default exports (excluding userApi which is already exported above)
export { default as authApi } from './auth.api';
export { default as customerApi } from './customer.api';
export { notificationApi } from './notification.api';
