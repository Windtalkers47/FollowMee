import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskApi, type Task } from '../../api/task.api';
import { userApi } from '../../api/user.api';
import { scheduleTaskQueryKey, scheduleTaskRequest, type ScheduleQueryState } from './schedule.contracts';

export const useScheduleController = ({
  queryState,
  userId,
  loadUsers,
}: {
  queryState: ScheduleQueryState;
  userId?: number;
  loadUsers: boolean;
}) => {
  const tasksQuery = useQuery({
    queryKey: scheduleTaskQueryKey(queryState),
    queryFn: () => taskApi.getTasks(scheduleTaskRequest(queryState, userId)),
    placeholderData: (previous) => previous,
  });
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
    enabled: loadUsers,
  });
  const scheduleMetaQuery = useQuery({
    queryKey: ['tasks', 'schedule-meta', userId],
    queryFn: taskApi.getScheduleMeta,
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  const tasks = useMemo(() => tasksQuery.data?.tasks || [], [tasksQuery.data?.tasks]);
  const groupedTasks = useMemo(() => tasks.reduce((groups, task) => {
    groups.all.push(task);
    groups[task.status]?.push(task);
    return groups;
  }, {
    all: [] as Task[], draft: [] as Task[], todo: [] as Task[], in_progress: [] as Task[],
    review: [] as Task[], done: [] as Task[], cancelled: [] as Task[],
  }), [tasks]);

  return {
    tasksResponse: tasksQuery.data,
    tasks,
    groupedTasks,
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
    users: usersQuery.data || [],
    scheduleMeta: scheduleMetaQuery.data,
  };
};
