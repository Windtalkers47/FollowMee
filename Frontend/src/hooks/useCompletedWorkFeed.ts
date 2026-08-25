import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { likeApi, taskApi, type TaskLikeSummary } from '../api/task.api';

export const useCompletedWorkFeed = ({
  activeTab,
  userId,
  searchQuery,
  isSearching,
}: {
  activeTab: number;
  userId?: number;
  searchQuery: string;
  isSearching: boolean;
}) => {
  const queryClient = useQueryClient();
  const [taskLikeSummaries, setTaskLikeSummaries] = useState<Record<string, TaskLikeSummary>>({});
  const allTasksQuery = useQuery({
    queryKey: ['all-tasks', activeTab, userId],
    queryFn: () => taskApi.getTasks({
      status: 'done',
      assignedTo: activeTab === 1 ? userId : undefined,
      limit: 30,
    }),
    enabled: activeTab === 0 || Boolean(userId),
    staleTime: 30_000,
  });
  const searchTasksQuery = useQuery({
    queryKey: ['search-tasks', searchQuery, activeTab, userId],
    queryFn: () => taskApi.getTasks({
      search: searchQuery,
      status: 'done',
      assignedTo: activeTab === 1 ? userId : undefined,
      limit: 30,
    }),
    enabled: false,
  });

  const refreshLikeSummary = useCallback(async (taskId: string) => {
    try {
      const summary = await likeApi.getTaskLikeSummary(taskId);
      setTaskLikeSummaries(current => ({ ...current, [taskId]: summary }));
    } catch (error) {
      console.error('Unable to refresh reaction summary:', error);
    }
  }, []);

  useEffect(() => {
    const handleRealtimeReaction = (event: Event) => {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (taskId) void refreshLikeSummary(taskId);
    };
    window.addEventListener('followmee:reaction-updated', handleRealtimeReaction);
    return () => window.removeEventListener('followmee:reaction-updated', handleRealtimeReaction);
  }, [refreshLikeSummary]);

  const runSearch = () => queryClient.fetchQuery({
    queryKey: ['search-tasks', searchQuery, activeTab, userId],
    queryFn: () => taskApi.getTasks({
      search: searchQuery,
      status: 'done',
      assignedTo: activeTab === 1 ? userId : undefined,
      limit: 30,
    }),
  });

  return {
    tasks: isSearching ? (searchTasksQuery.data?.tasks || []) : (allTasksQuery.data?.tasks || []),
    taskLikeSummaries,
    refreshLikeSummary,
    runSearch,
    refetch: allTasksQuery.refetch,
    loading: allTasksQuery.isLoading,
    error: allTasksQuery.error,
    searchLoading: searchTasksQuery.isLoading,
  };
};
