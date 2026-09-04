import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkActionApi, PrioritySuggestion, SuggestionAction, type Task, type TaskListResponse } from '../api/task.api';
import feedback from '../services/feedback.service';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAppSelector } from '../store/store';
import { applyTaskMutationDelete, applyTaskMutationSnapshot } from '../utils/taskMutationCache';

interface UseSmartSuggestionsOptions {
  enabled?: boolean;
  onSuccess?: (action: string, result: unknown) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for fetching and handling smart suggestions based on task due dates
 */
export const useSmartSuggestions = ({
  enabled = true,
  onSuccess,
  onError
}: UseSmartSuggestionsOptions = {}) => {
  const queryClient = useQueryClient();
  const userId = useAppSelector(state => state.auth.user?.userId);
  const { t } = useUserPreferences();
  const cachedTask = (taskId: string): Task | undefined => queryClient
    .getQueriesData<TaskListResponse>({ queryKey: ['tasks'] })
    .flatMap(([, data]) => data?.tasks || [])
    .find(task => task.taskId === taskId);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch priority summary
  const { data: prioritySummary, isLoading, refetch } = useQuery({
    queryKey: ['prioritySummary'],
    queryFn: bulkActionApi.getPrioritySummary,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Filter out dismissed suggestions
  const suggestions = prioritySummary?.suggestions.filter(
    s => !dismissedIds.has(s.id)
  ) || [];

  // Bulk update status mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: bulkActionApi.bulkUpdateStatus,
    onSuccess: (data) => {
      if (userId && data.tasks) data.tasks.forEach(task => applyTaskMutationSnapshot(queryClient, task, userId, cachedTask(task.taskId)));
      if (!data.tasks || data.failed.length) queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
      
      if (data.failed.length > 0) {
        void feedback.warning({ title: t('task.bulkUpdatePartialTitle'), message: t('task.bulkUpdatePartialText', { updated: data.updated, failed: data.failed.length }), importance: 'milestone' });
      } else {
        void feedback.success({ title: t('task.bulkUpdateTitle'), message: t('task.bulkUpdateText', { updated: data.updated }), importance: 'milestone' });
      }
      
      onSuccess?.('bulk-update', data);
    },
    onError: (error: Error) => {
      void feedback.error({ title: t('task.bulkUpdateFailedTitle'), message: t('task.bulkUpdateFailedText'), importance: 'milestone', persistent: true });
      onError?.(error);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkActionApi.bulkDelete,
    onSuccess: (data, variables) => {
      const deletedIds = data.deletedTaskIds || variables.taskIds.filter(taskId => !data.failed.includes(taskId));
      if (userId) deletedIds.forEach(taskId => {
        const previous = cachedTask(taskId);
        if (previous) applyTaskMutationDelete(queryClient, previous, userId);
      });
      if (data.failed.length) queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
      
      if (data.failed.length > 0) {
        void feedback.warning({ title: t('task.bulkDeletePartialTitle'), message: t('task.bulkDeletePartialText', { deleted: data.deleted ?? 0, failed: data.failed.length }), importance: 'milestone' });
      } else {
        void feedback.success({ title: t('task.bulkDeleteTitle'), message: t('task.bulkDeleteText', { deleted: data.deleted ?? 0 }), importance: 'milestone' });
      }
      
      onSuccess?.('bulk-delete', data);
    },
    onError: (error: Error) => {
      void feedback.error({ title: t('task.bulkDeleteFailedTitle'), message: t('task.bulkDeleteFailedText'), importance: 'milestone', persistent: true });
      onError?.(error);
    },
  });

  // Handle suggestion action click
  const handleSuggestionAction = useCallback((
    suggestion: PrioritySuggestion,
    action: SuggestionAction
  ) => {
    switch (action.type) {
      case 'mark-done':
        bulkUpdateMutation.mutate({
          taskIds: suggestion.taskIds,
          status: 'done'
        });
        break;

      case 'start-all':
        bulkUpdateMutation.mutate({
          taskIds: suggestion.taskIds,
          status: 'in_progress'
        });
        break;

      case 'reschedule':
        // TODO: Open reschedule dialog
        void feedback.info({ title: t('task.rescheduleUnavailableTitle'), message: t('task.rescheduleUnavailableText'), importance: 'milestone' });
        break;

      case 'review':
        bulkUpdateMutation.mutate({
          taskIds: suggestion.taskIds,
          status: 'review'
        });
        break;
    }
  }, [bulkUpdateMutation, t]);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  }, []);

  // Reset dismissed suggestions
  const resetDismissedSuggestions = useCallback(() => {
    setDismissedIds(new Set());
  }, []);

  // Get summary text
  const getSummaryText = useCallback((): string | null => {
    if (!prioritySummary) return null;
    
    if (prioritySummary.overdue > 0) {
      return `คุณมี ${prioritySummary.overdue} งานที่เกินกำหนด`;
    }
    if (prioritySummary.dueToday > 0) {
      return `วันนี้มี ${prioritySummary.dueToday} งานที่ต้องเสร็จ`;
    }
    if (prioritySummary.dueTomorrow > 0) {
      return `พรุ่งนี้มี ${prioritySummary.dueTomorrow} งาน`;
    }
    if (prioritySummary.dueWithin3Days > 0) {
      return `3 วันข้างหน้ามี ${prioritySummary.dueWithin3Days} งาน`;
    }
    
    return null;
  }, [prioritySummary]);

  return {
    // Data
    prioritySummary,
    suggestions,
    isLoading,
    
    // Actions
    handleSuggestionAction,
    dismissSuggestion,
    resetDismissedSuggestions,
    refetch,
    
    // Mutations
    bulkUpdate: bulkUpdateMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    
    // Helpers
    getSummaryText,
    hasOverdue: (prioritySummary?.overdue || 0) > 0,
    hasDueToday: (prioritySummary?.dueToday || 0) > 0,
  };
};

export default useSmartSuggestions;
