import axios from 'axios';
import { API_BASE_URL } from './config';

export interface User {
  userId: number;
  userName: string;
  userLastName: string;
  userEmail?: string;
  userImageUrl?: string;
}

export interface Task {
  taskId: string;
  title: string;
  description?: string;
  assignedTo?: number;
  createdBy: number;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  status: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  imageUrl?: string; // For backward compatibility - first image
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images?: TaskImage[];
  assignedToUser?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
  createdByUser: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
  _count?: {
    likes: number;
    love: number;
    laugh: number;
    angry: number;
    comments: number;
  };
}

export interface TaskImage {
  imageId: number;
  taskId: string;
  imageUrl: string;
  imageOrder: number;
  uploadedBy: number;
  createdAt: string;
  isActive: boolean;
  uploadedByUser?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
}

export interface TaskCommentReaction {
  reactionId: number;
  commentId: number;
  userId: number;
  reactionType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';
  createdAt: string;
  user: {
    userId: number;
    userName: string;
    userLastName: string;
  };
}

export interface TaskComment {
  commentId: number;
  taskId: string;
  userId: number;
  comment: string;
  commentImageUrl?: string;
  parentCommentId?: number;
  createdAt: string;
  isActive: boolean;
  user: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
  replies?: TaskComment[];
  reactions?: TaskCommentReaction[];
  _count?: {
    replies: number;
    reactions: number;
  };
}

export interface TaskLike {
  likeId: number;
  taskId: string;
  userId: number;
  likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';
  createdAt: string;
  user: {
    userId: number;
    userName: string;
    userLastName: string;
  };
}

export interface TaskLikeSummary {
  like: number;
  love: number;
  laugh: number;
  angry: number;
  wow: number;
  sad: number;
  total: number;
  userLike?: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';
}

export interface CreateTaskData {
  title: string;
  description?: string;
  assignedTo?: number;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  dueDateRange?: [Date, Date] | [null, null];
  imageUrl?: string; // Backward compatibility - single image
  images?: { imageUrl: string; imageOrder?: number }[]; // Multiple images
  status?: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  assignedTo?: number;
  dueDate?: Date | string;
  startDate?: Date | string;
  endDate?: Date | string;
  imageUrl?: string; // Backward compatibility - single image
  images?: { imageUrl: string; imageOrder?: number }[]; // Multiple images
  status?: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  isActive?: boolean;
}

export interface TaskQueryParams {
  search?: string;
  clearSearch?: boolean;
  includeStats?: boolean;
  status?: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  assignedTo?: number;
  createdBy?: number;
  page?: number;
  limit?: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  topPerformers?: {
    userId: number;
    userName: string;
    userLastName: string;
    completedTasks: number;
    score?: number;
  }[];
}

export interface CreateCommentData {
  comment: string;
  parentCommentId?: number;
  commentImageUrl?: string;
}

export interface UpdateCommentData {
  comment: string;
}

export interface MarkTaskDoneData {
  completionNote?: string;
}

export interface UserRank {
  rank: number;
  completedTasks: number;
  totalUsers: number;
  score?: number;
}

export interface MarkTaskDoneResponse {
  task: Task;
  userRank: UserRank;
}

export interface CreateLikeData {
  likeType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';
}

// ==================== Bulk Actions Types ====================

export interface BulkUpdateStatusData {
  taskIds: string[];
  status: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
}

export interface BulkDeleteData {
  taskIds: string[];
}

export interface BulkAssignData {
  taskIds: string[];
  assignedTo?: number;
}

export interface BulkActionResult {
  updated?: number;
  deleted?: number;
  assigned?: number;
  failed: string[];
}

// ==================== Priority Summary Types ====================

export interface PrioritySuggestion {
  id: string;
  translationKey: 'overdue' | 'today' | 'tomorrow' | 'soon';
  title: string;
  type: 'due-today' | 'due-tomorrow' | 'overdue' | 'due-within-3-days';
  taskIds: string[];
  count: number;
  priority: number;
  message: string;
  actions: SuggestionAction[];
}

export interface SuggestionAction {
  id: string;
  label: string;
  type: 'mark-done' | 'start-all' | 'reschedule' | 'review';
  icon?: string;
  color?: string;
}

export interface PrioritySummaryResponse {
  dueToday: number;
  dueTomorrow: number;
  overdue: number;
  dueWithin3Days: number;
  totalTasks: number;
  suggestedAction?: string;
  suggestions: PrioritySuggestion[];
}

// Task CRUD operations
export const taskApi = {
  // Create a new task
  createTask: async (data: CreateTaskData): Promise<Task> => {
    const response = await axios.post(`${API_BASE_URL}/tasks`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get tasks with filtering and pagination
  getTasks: async (params?: TaskQueryParams): Promise<TaskListResponse> => {
    const response = await axios.get(`${API_BASE_URL}/tasks`, {
      params,
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get a specific task by ID
  getTaskById: async (taskId: string): Promise<Task> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Update a task
  updateTask: async (taskId: string, data: UpdateTaskData): Promise<Task> => {
    const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Delete a task
  deleteTask: async (taskId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/tasks/${taskId}`, {
      withCredentials: true,
    });
  },

  // Upload single image
  uploadImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post(`${API_BASE_URL}/tasks/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });
    return response.data.data;
  },

  // Validate image URL
  validateImageUrl: async (url: string): Promise<{ 
    isValid: boolean; 
    contentType?: string; 
    fileSize?: number;
  }> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/validate-url`, 
      { url }, 
      { withCredentials: true }
    );
    return response.data.data;
  },

  // Create task with files
  createTaskWithFiles: async (taskData: CreateTaskData, files: File[]): Promise<Task> => {
    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));
    
    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await axios.post(`${API_BASE_URL}/tasks/with-files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });
    return response.data.data;
  },

  // Update task with files
  updateTaskWithFiles: async (taskId: string, taskData: UpdateTaskData, files: File[]): Promise<Task> => {
    const formData = new FormData();
    formData.append('taskData', JSON.stringify(taskData));
    
    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}/with-files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get current user's tasks
  getMyTasks: async (): Promise<Task[]> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/my-tasks`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get tasks assigned to current user
  getTasksAssignedToMe: async (): Promise<Task[]> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/assigned-to-me`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get top performers
  getTopPerformers: async (limit: number = 5): Promise<{
    userId: number;
    userName: string;
    userLastName: string;
    completedTasks: number;
    score?: number;
  }[]> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/top-performers`, {
      params: { limit },
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get current user's rank
  getMyRank: async (): Promise<UserRank> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/my-rank`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Mark task as done
  markTaskAsDone: async (taskId: string, data?: MarkTaskDoneData): Promise<MarkTaskDoneResponse> => {
    const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}/mark-done`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Mark task as undone
  markTaskAsUndone: async (taskId: string): Promise<MarkTaskDoneResponse> => {
    const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}/mark-undone`, {}, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Approve task (from review to done)
  approveTask: async (taskId: string): Promise<MarkTaskDoneResponse> => {
    const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}/approve`, {}, {
      withCredentials: true,
    });
    return response.data.data;
  },

  };

// Comment operations
export const commentApi = {
  // Create a comment on a task
  createComment: async (taskId: string, data: CreateCommentData): Promise<TaskComment> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/comments`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get all comments for a task
  getTaskComments: async (taskId: string): Promise<TaskComment[]> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/comments`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Update a comment
  updateComment: async (taskId: string, commentId: number, data: UpdateCommentData): Promise<TaskComment> => {
    const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Delete a comment
  deleteComment: async (taskId: string, commentId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
      withCredentials: true,
    });
  },

  // Upload image for comment
  uploadCommentImage: async (file: File): Promise<{ commentImageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post(`${API_BASE_URL}/tasks/comments/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });
    return response.data.data;
  },
};

// Comment reaction operations
export const commentReactionApi = {
  // Create or update a reaction on a comment
  createOrUpdateReaction: async (commentId: number, data: { reactionType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad' }): Promise<TaskCommentReaction> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/comments/${commentId}/reactions`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Remove reaction from a comment
  removeReaction: async (commentId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/tasks/comments/${commentId}/reactions`, {
      withCredentials: true,
    });
  },

  // Get all reactions for a comment
  getCommentReactions: async (commentId: number): Promise<TaskCommentReaction[]> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/comments/${commentId}/reactions`, {
      withCredentials: true,
    });
    return response.data.data;
  },
};

// Like operations
export const likeApi = {
  // Create or update a like on a task
  createOrUpdateLike: async (taskId: string, data: CreateLikeData): Promise<TaskLike> => {
    const response = await axios.post(`${API_BASE_URL}/tasks/${taskId}/likes`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Remove like from a task
  removeLike: async (taskId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/tasks/${taskId}/likes`, {
      withCredentials: true,
    });
  },

  // Get all likes for a task
  getTaskLikes: async (taskId: string): Promise<TaskLike[]> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/likes`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get like summary for a task
  getTaskLikeSummary: async (taskId: string): Promise<TaskLikeSummary> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/likes/summary`, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get current user's like on a task
  getMyLikeOnTask: async (taskId: string): Promise<TaskLike | null> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/${taskId}/likes/my-like`, {
      withCredentials: true,
    });
    return response.data.data;
  },
};

// ==================== Bulk Actions API ====================

export const bulkActionApi = {
  // Bulk update status for multiple tasks
  bulkUpdateStatus: async (data: BulkUpdateStatusData): Promise<BulkActionResult> => {
    const response = await axios.put(`${API_BASE_URL}/tasks/bulk-update-status`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Bulk delete multiple tasks
  bulkDelete: async (data: BulkDeleteData): Promise<BulkActionResult> => {
    const response = await axios.delete(`${API_BASE_URL}/tasks/bulk-delete`, {
      data,
      withCredentials: true,
    });
    return response.data.data;
  },

  // Bulk assign multiple tasks to a user
  bulkAssign: async (data: BulkAssignData): Promise<BulkActionResult> => {
    const response = await axios.put(`${API_BASE_URL}/tasks/bulk-assign`, data, {
      withCredentials: true,
    });
    return response.data.data;
  },

  // Get priority summary with smart suggestions
  getPrioritySummary: async (): Promise<PrioritySummaryResponse> => {
    const response = await axios.get(`${API_BASE_URL}/tasks/priority-summary`, {
      withCredentials: true,
    });
    return response.data.data;
  },
};
