/**
 * Dashboard DTOs
 * Data Transfer Objects for Dashboard API
 */

// Customer Statistics
export interface CustomerStats {
  totalCustomers: number;
  customersByStatus: {
    active: number;
    inactive: number;
    newThisWeek: number;
  };
  customerTrend: CustomerTrendItem[];
}

export interface CustomerTrendItem {
  date: string;
  active: number;
  inactive: number;
  new: number;
}

// Task Statistics
export interface TaskStats {
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
  taskTrend: TaskTrendItem[];
}

export interface TaskTrendItem {
  date: string;
  completed: number;
  pending: number;
}

// User Rank & Performance
export interface UserRankInfo {
  rank: number;
  score: number;
  nextRankScore: number | null;
  prevRankScore: number | null;
  completedTasks: number;
  totalUsers: number;
  progressToNext: number; // Percentage 0-100
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

export interface LeaderboardResponse {
  myRank: UserRankInfo;
  topPerformers: LeaderboardItem[];
}

// Combined Dashboard Stats Response
export interface DashboardStatsResponse {
  customerStats: CustomerStats;
  taskStats: TaskStats;
  userRank: UserRankInfo;
}

// Pending Tasks Response
export interface PendingTaskItem {
  taskId: string;
  title: string;
  status: string;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: number;
  createdBy?: number;
}

export interface PendingTasksResponse {
  tasks: PendingTaskItem[];
  total: number;
}