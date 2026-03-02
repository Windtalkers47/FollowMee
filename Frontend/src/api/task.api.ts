import axios from 'axios';
import { API_BASE_URL } from './config';

export interface Task {
  taskId: string;
  title: string;
  description?: string;
  assignedTo?: number;
  createdBy: number;
  dueDate?: string;
  status: 'draft' | 'upcoming' | 'past' | 'done';
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedToUser?: {
    userId: number;
    userName: string;
    userLastName: string;
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

export interface TaskComment {
  commentId: number;
  taskId: string;
  userId: number;
  comment: string;
  createdAt: string;
  user: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
}

export interface TaskLike {
  likeId: number;
  taskId: string;
  userId: number;
  likeType: 'like' | 'love' | 'laugh' | 'angry';
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
  total: number;
  userLike?: 'like' | 'love' | 'laugh' | 'angry';
}

export interface CreateTaskData {
  title: string;
  description?: string;
  assignedTo?: number;
  dueDate?: Date | string;
  imageUrl?: string;
  status?: 'draft' | 'upcoming' | 'past' | 'done';
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  assignedTo?: number;
  dueDate?: Date | string;
  imageUrl?: string;
  status?: 'draft' | 'upcoming' | 'past' | 'done';
  isActive?: boolean;
}

export interface TaskQueryParams {
  search?: string;
  status?: 'draft' | 'upcoming' | 'past' | 'done';
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
}

export interface CreateCommentData {
  comment: string;
}

export interface UpdateCommentData {
  comment: string;
}

export interface CreateLikeData {
  likeType: 'like' | 'love' | 'laugh' | 'angry';
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
