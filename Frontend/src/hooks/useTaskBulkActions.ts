import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkActionApi, type Task, type TaskListResponse } from '../api/task.api';
import toast from '../utils/toast';
import { useAppSelector } from '../store/store';
import { applyTaskMutationDelete, applyTaskMutationSnapshot } from '../utils/taskMutationCache';

export const useTaskBulkActions = (onSettled?: () => void) => {
  const queryClient = useQueryClient();
  const userId = useAppSelector(state => state.auth.user?.userId);
  const cachedTask = (taskId: string): Task | undefined => {
    const lists = queryClient.getQueriesData<TaskListResponse>({ queryKey: ['tasks'] });
    return lists.flatMap(([, data]) => data?.tasks || []).find(task => task.taskId === taskId)
      || queryClient.getQueryData<Task>(['task-detail', taskId]);
  };
  const refreshAffectedLists = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['my-work'] });
    onSettled?.();
  };

  const update = useMutation({
    mutationFn: bulkActionApi.bulkUpdateStatus,
    onSuccess: (result) => {
      if (userId && result.tasks) {
        result.tasks.forEach(task => applyTaskMutationSnapshot(queryClient, task, userId, cachedTask(task.taskId)));
        if (result.failed.length) refreshAffectedLists();
        else onSettled?.();
      } else refreshAffectedLists();
      if (result.failed.length > 0) {
        toast.warning(`Updated ${result.updated} tasks; ${result.failed.length} could not be updated.`);
      } else {
        toast.success(`Updated ${result.updated} tasks.`);
      }
    },
    onError: () => toast.error('Could not update the selected tasks.'),
  });

  const remove = useMutation({
    mutationFn: bulkActionApi.bulkDelete,
    onSuccess: (result, variables) => {
      const deletedIds = result.deletedTaskIds || variables.taskIds.filter(taskId => !result.failed.includes(taskId));
      if (userId && deletedIds.length) {
        deletedIds.forEach(taskId => {
          const previous = cachedTask(taskId);
          if (previous) applyTaskMutationDelete(queryClient, previous, userId);
        });
        if (result.failed.length) refreshAffectedLists();
        else onSettled?.();
      } else refreshAffectedLists();
      if (result.failed.length > 0) {
        toast.warning(`Deleted ${result.deleted} tasks; ${result.failed.length} could not be deleted.`);
      } else {
        toast.success(`Deleted ${result.deleted} tasks.`);
      }
    },
    onError: () => toast.error('Could not delete the selected tasks.'),
  });

  return {
    bulkUpdate: update.mutate,
    bulkDelete: remove.mutate,
    isPending: update.isPending || remove.isPending,
  };
};

export default useTaskBulkActions;
