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
      draft: number;
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

// Cache configurations - ต่างกันตามประเภทข้อมูล
const STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 นาที (Stats เปลี่ยนตาม time range)
const LEADERBOARD_CACHE_DURATION = 30 * 60 * 1000; // 30 นาที (Leaderboard ไม่ค่อยเปลี่ยน)
const PENDING_TASKS_CACHE_DURATION = 5 * 60 * 1000; // 5 นาที (Tasks เปลี่ยนบ่อยปานกลาง)

// Cache stores
const statsCache = new Map<string, { data: DashboardStats; timestamp: number }>();
const leaderboardCache = new Map<string, { data: LeaderboardData; timestamp: number }>();
const pendingTasksCache = new Map<string, { data: PendingTasksData; timestamp: number }>();

/**
 * Get dashboard statistics with caching
 * @param range - Time range: '1d' | '5d' | '7d' | '1m' | '3m' | '6m' | 'ytd' | '1y' | '5y' (default: '1d')
 */
export const getDashboardStats = async (range: '1d' | '5d' | '7d' | '1m' | '3m' | '6m' | 'ytd' | '1y' | '5y' = '1d'): Promise<DashboardStats> => {
  const cacheKey = `stats_${range}`;
  const cached = statsCache.get(cacheKey);
  const now = Date.now();
  
  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < STATS_CACHE_DURATION) {
    return cached.data;
  }
  
  const response = await api.get<ApiResponse<DashboardStats>>(`/dashboard/stats?range=${range}`);
  const data = response.data.data;
  
  // Cache the result
  statsCache.set(cacheKey, { data, timestamp: now });
  
  return data;
};

/**
 * Get leaderboard with caching
 * @param limit - Number of top performers to return (default: 5)
 */
export const getLeaderboard = async (limit: number = 5): Promise<LeaderboardData> => {
  const cacheKey = `leaderboard_${limit}`;
  const cached = leaderboardCache.get(cacheKey);
  const now = Date.now();
  
  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < LEADERBOARD_CACHE_DURATION) {
    return cached.data;
  }
  
  const response = await api.get<ApiResponse<LeaderboardData>>(
    `/dashboard/leaderboard?limit=${limit}`
  );
  const data = response.data.data;
  
  // Cache the result
  leaderboardCache.set(cacheKey, { data, timestamp: now });
  
  return data;
};

/**
 * Get pending tasks with caching
 * @param limit - Number of tasks to return (default: 5)
 */
export const getPendingTasks = async (limit: number = 5): Promise<PendingTasksData> => {
  const cacheKey = `pending_tasks_${limit}`;
  const cached = pendingTasksCache.get(cacheKey);
  const now = Date.now();
  
  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < PENDING_TASKS_CACHE_DURATION) {
    return cached.data;
  }
  
  const response = await api.get<ApiResponse<PendingTasksData>>(
    `/dashboard/pending-tasks?limit=${limit}`
  );
  const data = response.data.data;
  
  // Cache the result
  pendingTasksCache.set(cacheKey, { data, timestamp: now });
  
  return data;
};

/**
 * Clear all caches
 */
export const clearAllCaches = (): void => {
  statsCache.clear();
  leaderboardCache.clear();
  pendingTasksCache.clear();
};

/**
 * Clear specific cache
 */
export const clearCache = (type: 'stats' | 'leaderboard' | 'pendingTasks'): void => {
  switch (type) {
    case 'stats':
      statsCache.clear();
      break;
    case 'leaderboard':
      leaderboardCache.clear();
      break;
    case 'pendingTasks':
      pendingTasksCache.clear();
      break;
  }
};
