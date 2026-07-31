import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkActionApi } from '../api/task.api';
import toast from '../utils/toast';

export const useTaskBulkActions = (onSettled?: () => void) => {
  const queryClient = useQueryClient();
  const refreshAffectedLists = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['my-work'] });
    onSettled?.();
  };

  const update = useMutation({
    mutationFn: bulkActionApi.bulkUpdateStatus,
    onSuccess: (result) => {
      refreshAffectedLists();
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
    onSuccess: (result) => {
      refreshAffectedLists();
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
