import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkActionApi, type Task, type TaskListResponse } from '../api/task.api';
import feedback from '../services/feedback.service';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAppSelector } from '../store/store';
import { applyTaskMutationDelete, applyTaskMutationSnapshot } from '../utils/taskMutationCache';

export const useTaskBulkActions = (onSettled?: () => void) => {
  const queryClient = useQueryClient();
  const userId = useAppSelector(state => state.auth.user?.userId);
  const { t } = useUserPreferences();
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
        void feedback.warning({ title: t('task.bulkUpdatePartialTitle'), message: t('task.bulkUpdatePartialText', { updated: result.updated, failed: result.failed.length }), importance: 'milestone' });
      } else {
        void feedback.success({ title: t('task.bulkUpdateTitle'), message: t('task.bulkUpdateText', { updated: result.updated }), importance: 'milestone' });
      }
    },
    onError: () => void feedback.error({ title: t('task.bulkUpdateFailedTitle'), message: t('task.bulkUpdateFailedText'), importance: 'milestone', persistent: true }),
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
        void feedback.warning({ title: t('task.bulkDeletePartialTitle'), message: t('task.bulkDeletePartialText', { deleted: result.deleted ?? 0, failed: result.failed.length }), importance: 'milestone' });
      } else {
        void feedback.success({ title: t('task.bulkDeleteTitle'), message: t('task.bulkDeleteText', { deleted: result.deleted ?? 0 }), importance: 'milestone' });
      }
    },
    onError: () => void feedback.error({ title: t('task.bulkDeleteFailedTitle'), message: t('task.bulkDeleteFailedText'), importance: 'milestone', persistent: true }),
  });

  return {
    bulkUpdate: update.mutate,
    bulkDelete: remove.mutate,
    isPending: update.isPending || remove.isPending,
  };
};

export default useTaskBulkActions;
