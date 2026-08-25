import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';
import { taskApi, type CreateTaskData, type Task, type TaskListResponse, type UpdateTaskData } from '../../api/task.api';
import feedback from '../../services/feedback.service';
import { applyTaskMutationDelete, applyTaskMutationSnapshot } from '../../utils/taskMutationCache';
import { isAllowedTaskTransition } from '../../utils/taskWorkflow';
import { translateRewardKey } from '../../utils/rewardPresentation';
import type { MessageKey } from '../../i18n/messages';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export const useScheduleMutations = ({
  tasksResponse, editingTask, userId, navigate, t,
}: {
  tasksResponse?: TaskListResponse;
  editingTask?: Task;
  userId?: number;
  navigate: NavigateFunction;
  t: Translator;
}) => {
  const queryClient = useQueryClient();
  const previousTask = (taskId: string) => tasksResponse?.tasks.find((task) => task.taskId === taskId);

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => taskApi.createTask(data),
    onSuccess: (createdTask) => {
      if (userId) applyTaskMutationSnapshot(queryClient, createdTask, userId);
      void feedback.success({
        title: createdTask.status === 'draft' ? t('task.form.saveDraft') : t('myWork.updated'),
        message: createdTask.status === 'draft' ? createdTask.title : t('myWork.updatedText'),
        importance: createdTask.status === 'draft' ? 'routine' : 'milestone',
        nextAction: createdTask.status === 'draft' ? undefined : {
          label: t('myWork.open'), onClick: () => navigate(`/tasks/${createdTask.taskId}`),
        },
      });
    },
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: UpdateTaskData }) => taskApi.updateTask(taskId, data),
    onSuccess: (updatedTask, variables) => {
      const previous = previousTask(updatedTask.taskId) || editingTask;
      if (userId) applyTaskMutationSnapshot(queryClient, updatedTask, userId, previous);
      if (!variables.data.status) {
        void feedback.success({ title: t('myWork.updated'), message: updatedTask.title });
      } else if (variables.data.status === 'todo' && editingTask?.status === 'draft') {
        void feedback.success({
          title: t('myWork.updated'), message: t('myWork.updatedText'), importance: 'milestone',
          nextAction: { label: t('myWork.open'), onClick: () => navigate(`/tasks/${updatedTask.taskId}`) },
        });
      }
    },
  });
  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: (_, taskId) => {
      const previous = previousTask(taskId);
      if (previous && userId) applyTaskMutationDelete(queryClient, previous, userId);
      else void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  const markTaskDoneMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data?: { completionNote?: string } }) => taskApi.markTaskAsDone(taskId, data),
    onSuccess: (response, variables) => {
      if (userId) applyTaskMutationSnapshot(queryClient, response.task, userId, previousTask(variables.taskId));
    },
  });
  const markTaskUndoneMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.markTaskAsUndone(taskId),
    onSuccess: (response) => {
      if (userId) applyTaskMutationSnapshot(queryClient, response.task, userId, previousTask(response.task.taskId));
      void queryClient.invalidateQueries({ queryKey: ['rewards', 'summary'] });
      const achievement = response.earnedAchievements?.[0];
      if (achievement) void feedback.success({
        title: translateRewardKey(t, achievement.nameKey), message: t('achievement.unlockedMessage'), importance: 'milestone',
        nextAction: { label: t('achievement.viewCollection'), onClick: () => navigate(`/rewards?tab=achievements&achievement=${achievement.badgeKey}`) },
      });
    },
  });
  const approveTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.approveTask(taskId),
    onSuccess: (response) => {
      if (userId) applyTaskMutationSnapshot(queryClient, response.task, userId, previousTask(response.task.taskId));
    },
  });

  const confirmMutation = async ({
    taskId, title, text, icon, confirm, cancel, mutate, successTitle, successText, successIcon = 'success', importance,
  }: {
    taskId: string; title: MessageKey; text: MessageKey; icon: 'question' | 'warning'; confirm: MessageKey; cancel: MessageKey;
    mutate: (taskId: string) => Promise<unknown>; successTitle: MessageKey; successText: MessageKey;
    successIcon?: 'success' | 'info'; importance?: 'milestone';
  }) => {
    const result = await feedback.fire({
      title: t(title), text: t(text), icon, showCancelButton: true, confirmButtonText: t(confirm),
      cancelButtonText: t(cancel), reverseButtons: true, showLoaderOnConfirm: true,
      preConfirm: () => { feedback.showLoading(); return mutate(taskId); },
    });
    if (result.isConfirmed) await feedback.fire({
      title: t(successTitle), text: t(successText), icon: successIcon, importance,
      timer: importance === 'milestone' ? 5000 : 2000, showConfirmButton: false,
    });
  };

  const updateStatus = async (taskId: string, status: Task['status']) => {
    const task = previousTask(taskId);
    if (task && !isAllowedTaskTransition(task, status)) {
      await feedback.fire({ title: t('task.invalidTransitionTitle'), text: t('task.invalidTransitionText'), icon: 'warning', timer: 2200, showConfirmButton: false });
      return;
    }
    try {
      await updateTaskMutation.mutateAsync({ taskId, data: { status } });
      const statusMessages: Record<string, string> = {
        todo: 'Task moved to To Do', in_progress: 'Task started', review: 'Task submitted for review',
        done: 'Task completed', cancelled: 'Task cancelled', draft: 'Task moved to Draft',
      };
      await feedback.fire({
        title: t('task.statusUpdated'), text: statusMessages[status] || t('task.statusUpdatedText'), icon: 'success',
        importance: status === 'review' || status === 'done' ? 'milestone' : 'routine',
        timer: status === 'review' || status === 'done' ? 5000 : 2000, showConfirmButton: false,
      });
    } catch (error: unknown) {
      const apiError = (error as { response?: { data?: { code?: string } } })?.response?.data;
      await feedback.fire({
        title: apiError?.code === 'INVALID_TASK_TRANSITION' ? t('task.invalidTransitionTitle') : t('common.error'),
        text: apiError?.code === 'INVALID_TASK_TRANSITION' ? t('task.invalidTransitionText') : t('task.statusUpdateFailed'),
        icon: 'error', timer: 2000, showConfirmButton: false,
      });
    }
  };

  return {
    createTaskMutation, updateTaskMutation,
    deleteTask: (taskId: string) => deleteTaskMutation.mutate(taskId),
    markDone: (taskId: string) => markTaskDoneMutation.mutate({ taskId }),
    markUndone: (taskId: string) => markTaskUndoneMutation.mutate(taskId),
    updateStatus,
    approve: (taskId: string) => confirmMutation({ taskId, title: 'task.approveTitle', text: 'task.approveQuestion', icon: 'question', confirm: 'task.approveConfirm', cancel: 'common.cancel', mutate: approveTaskMutation.mutateAsync, successTitle: 'task.approvedTitle', successText: 'task.approvedText', importance: 'milestone' }),
    reject: (taskId: string) => confirmMutation({ taskId, title: 'task.rejectTitle', text: 'task.rejectQuestion', icon: 'warning', confirm: 'task.rejectConfirm', cancel: 'common.cancel', mutate: markTaskUndoneMutation.mutateAsync, successTitle: 'task.rejectedTitle', successText: 'task.rejectedText', importance: 'milestone' }),
    undo: (taskId: string) => confirmMutation({ taskId, title: 'task.reopenTitle', text: 'task.reopenQuestion', icon: 'question', confirm: 'task.reopenConfirm', cancel: 'common.cancel', mutate: markTaskUndoneMutation.mutateAsync, successTitle: 'task.reopenedTitle', successText: 'task.reopenedText', successIcon: 'info' }),
    cancel: (taskId: string) => confirmMutation({ taskId, title: 'task.cancelTitle', text: 'task.cancelQuestion', icon: 'warning', confirm: 'task.cancelConfirm', cancel: 'task.keep', mutate: (id) => updateTaskMutation.mutateAsync({ taskId: id, data: { status: 'cancelled' } }), successTitle: 'task.cancelledTitle', successText: 'task.cancelledText', successIcon: 'info' }),
    startProgress: (taskId: string) => confirmMutation({ taskId, title: 'task.startTitle', text: 'task.startQuestion', icon: 'question', confirm: 'task.startConfirm', cancel: 'task.notYet', mutate: (id) => updateTaskMutation.mutateAsync({ taskId: id, data: { status: 'in_progress' } }), successTitle: 'task.startedTitle', successText: 'task.startedText' }),
  };
};
