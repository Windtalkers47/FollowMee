import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkActionApi, PrioritySummaryResponse, PrioritySuggestion, SuggestionAction } from '../api/task.api';
import toast from '../utils/toast';

interface UseSmartSuggestionsOptions {
  enabled?: boolean;
  onSuccess?: (action: string, result: any) => void;
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
      
      if (data.failed.length > 0) {
        toast.warning(
          `Updated ${data.updated} tasks. ${data.failed.length} failed (permission denied).`
        );
      } else {
        toast.success(`Updated ${data.updated} tasks successfully!`);
      }
      
      onSuccess?.('bulk-update', data);
    },
    onError: (error: Error) => {
      toast.error('Failed to update tasks');
      onError?.(error);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkActionApi.bulkDelete,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['prioritySummary'] });
      
      if (data.failed.length > 0) {
        toast.warning(
          `Deleted ${data.deleted} tasks. ${data.failed.length} failed (permission denied).`
        );
      } else {
        toast.success(`Deleted ${data.deleted} tasks successfully!`);
      }
      
      onSuccess?.('bulk-delete', data);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete tasks');
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
        toast.info('Reschedule feature coming soon');
        break;

      case 'review':
        bulkUpdateMutation.mutate({
          taskIds: suggestion.taskIds,
          status: 'review'
        });
        break;
    }
  }, [bulkUpdateMutation]);

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