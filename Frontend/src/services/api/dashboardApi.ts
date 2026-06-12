import api from '../api';

// Define types locally for frontend use
export interface DashboardStats {
  customerStats: {
    totalCustomers: number;
    customersByStatus: {
      active: number;
      inactive: number;
      newThisWeek: number;
    };
    customerTrend: Array<{
      date: string;
      active: number;
      inactive: number;
      new: number;
    }>;
  };
  taskStats: {
    pendingTasks: number;
    totalTasks: number;
    completionRate: number;
    tasksByStatus: {
      todo: number;
      in_progress: number;
      review: number;
      done: number;
      cancelled: number;
    };
    taskTrend: Array<{
      date: string;
      completed: number;
      pending: number;
    }>;
  };
  userRank: {
    rank: number;
    score: number;
    nextRankScore: number | null;
    prevRankScore: number | null;
    completedTasks: number;
    totalUsers: number;
    progressToNext: number;
  };
}

export interface LeaderboardItem {
  rank: number;
  userId: number;
  userName: string;
  userLastName: string;
  userImageUrl?: string;
  completedTasks: number;
  score: number;
}

export interface LeaderboardData {
  myRank: {
    rank: number;
    score: number;
    nextRankScore: number | null;
    prevRankScore: number | null;
    completedTasks: number;
    totalUsers: number;
    progressToNext: number;
  };
  topPerformers: LeaderboardItem[];
}

export interface PendingTask {
  taskId: string;
  title: string;
  status: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: number;
  createdBy?: number;
}

export interface PendingTasksData {
  tasks: PendingTask[];
  total: number;
}

// Helper type for API response
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Get dashboard statistics
 * @param range - Time range: '7d' | '1m' | '3m' | '6m' | '1y' (default: '7d')
 */
export const getDashboardStats = async (range: '7d' | '1m' | '3m' | '6m' | '1y' = '7d'): Promise<DashboardStats> => {
  const response = await api.get<ApiResponse<DashboardStats>>(`/dashboard/stats?range=${range}`);
  return response.data.data;
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (limit: number = 5): Promise<LeaderboardData> => {
  const response = await api.get<ApiResponse<LeaderboardData>>(
    `/dashboard/leaderboard?limit=${limit}`
  );
  return response.data.data;
};

/**
 * Get pending tasks
 */
export const getPendingTasks = async (limit: number = 5): Promise<PendingTasksData> => {
  const response = await api.get<ApiResponse<PendingTasksData>>(
    `/dashboard/pending-tasks?limit=${limit}`
  );
  return response.data.data;
};