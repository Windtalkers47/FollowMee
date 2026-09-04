import { useState, useEffect, useRef } from 'react';
import { Task, TaskImage, CreateTaskData, User, taskApi } from '../api/task.api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import feedback from '../services/feedback.service';
import { userFacingMutationError } from '../utils/userFacingError';

export type TaskSaveIntent = 'draft' | 'publish' | 'save';

interface UseTaskFormProps {
  task?: Task;
  users: User[];
  onSave: (task: CreateTaskData, intent: TaskSaveIntent) => Promise<void> | void;
}

interface FormErrors {
  [key: string]: string | undefined;
}

export const useTaskForm = ({ task, users, onSave }: UseTaskFormProps) => {
  const { t } = useUserPreferences();
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    assignedTo: undefined,
    priority: 'normal',
    watcherIds: [],
    dueDate: undefined,
    startDate: undefined,
    endDate: undefined,
    dueDateRange: undefined,
    status: 'draft',
    images: []
  });

  const [images, setImages] = useState<TaskImage[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictFields, setConflictFields] = useState<string[]>([]);
  const originalTaskRef = useRef<Task | undefined>(task);
  const firstValidationFieldRef = useRef<string | undefined>(undefined);

  const changedFields = (current: CreateTaskData, baseline: Task): string[] => {
    const changed: string[] = [];
    if (current.title !== baseline.title) changed.push('title');
    if ((current.description || '') !== (baseline.description || '')) changed.push('description');
    if ((current.assignedTo || null) !== (baseline.assignedTo || null)) changed.push('assignedTo');
    if (current.priority !== baseline.priority) changed.push('priority');
    if (JSON.stringify(current.watcherIds || []) !== JSON.stringify(baseline.watcherIds || [])) changed.push('watcherIds');
    const baselineRange = baseline.startDate && baseline.endDate ? [baseline.startDate, baseline.endDate] : [];
    if (JSON.stringify(current.dueDateRange || []) !== JSON.stringify(baselineRange)) changed.push('dueDateRange');
    return changed;
  };

  const reloadLatest = async (keepDraft: boolean) => {
    if (!task) return;
    const latest = await taskApi.getTaskById(task.taskId);
    const changed = keepDraft && originalTaskRef.current ? changedFields(formData, originalTaskRef.current) : [];
    const latestData: CreateTaskData = {
      title: latest.title, description: latest.description || '', assignedTo: latest.assignedTo,
      priority: latest.priority, watcherIds: latest.watcherIds, expectedVersion: latest.version,
      dueDate: latest.dueDate ? new Date(latest.dueDate) : undefined,
      startDate: latest.startDate ? new Date(latest.startDate) : undefined,
      endDate: latest.endDate ? new Date(latest.endDate) : undefined,
      dueDateRange: latest.startDate && latest.endDate ? [new Date(latest.startDate), new Date(latest.endDate)] : undefined,
      status: latest.status, images: latest.images || [], createdAt: latest.createdAt, updatedAt: latest.updatedAt,
    };
    const merged = keepDraft ? {
      ...latestData,
      ...(changed.includes('title') ? { title: formData.title } : {}),
      ...(changed.includes('description') ? { description: formData.description } : {}),
      ...(changed.includes('assignedTo') ? { assignedTo: formData.assignedTo } : {}),
      ...(changed.includes('priority') ? { priority: formData.priority } : {}),
      ...(changed.includes('watcherIds') ? { watcherIds: formData.watcherIds } : {}),
      ...(changed.includes('dueDateRange') ? { dueDateRange: formData.dueDateRange } : {}),
    } : latestData;
    setFormData(merged);
    setImages(latest.images || []);
    setConflictFields(changed);
    originalTaskRef.current = latest;
    setFormErrors({});
  };

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      originalTaskRef.current = task;
      setFormData({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedTo,
        priority: task.priority,
        watcherIds: task.watcherIds,
        expectedVersion: task.version,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        startDate: task.startDate ? new Date(task.startDate) : undefined,
        endDate: task.endDate ? new Date(task.endDate) : undefined,
        dueDateRange: task.startDate && task.endDate 
          ? [new Date(task.startDate), new Date(task.endDate)]
          : task.dueDate 
          ? [new Date(task.dueDate), new Date(task.dueDate)]
          : undefined,
        status: task.status,
        images: task.images || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      });
      setImages(task.images || []);
    } else {
      setFormData({
        title: '',
        description: '',
        assignedTo: undefined,
        priority: 'normal',
        watcherIds: [],
        dueDate: undefined,
        status: 'draft',
        images: []
      });
      setImages([]);
    }
    setFormErrors({});
    setConflictFields([]);
  }, [task]);

  const handleInputChange = <K extends keyof CreateTaskData>(field: K, value: CreateTaskData[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImagesChange = (newImages: TaskImage[]) => {
    setImages(newImages);
    setFormData(prev => ({
      ...prev,
      images: newImages.map(img => ({
        imageUrl: img.imageUrl,
        imageOrder: img.imageOrder
      }))
    }));
  };

  const validateForm = (intent: TaskSaveIntent = 'save'): boolean => {
    const errors: FormErrors = {};

    if (!formData.title.trim()) {
      errors.title = t('task.form.titleRequired');
    }

    if (formData.title.length > 255) {
      errors.title = t('task.form.titleTooLong');
    }

    if (formData.description && formData.description.length > 2000) {
      errors.description = t('task.form.descriptionTooLong');
    }
    if (intent === 'publish' && !formData.assignedTo) {
      errors.assignedTo = t('task.form.assigneeRequired');
    }

    setFormErrors(errors);
    firstValidationFieldRef.current = Object.keys(errors)[0];
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (intent: TaskSaveIntent = 'save') => {
    if (!validateForm(intent)) {
      const firstField = firstValidationFieldRef.current;
      if (firstField) window.setTimeout(() => {
        const element = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
        element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        element?.focus({ preventScroll: true });
      }, 0);
      void feedback.error({ title: t('feedback.validationTitle'), message: t('feedback.validationHelp'), importance: 'milestone' });
      return false;
    }

    setIsSubmitting(true);
    try {
      const taskData = {
        ...formData,
        images: images.map(img => ({
          imageUrl: img.imageUrl,
          imageOrder: img.imageOrder
        }))
      };

      // Call the onSave callback with the task data instead of making API call here
      await onSave(taskData, intent);
      return true;
    } catch (error) {
      setFormErrors({ submit: t('task.form.saveFailed') });
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      console.warn('Task mutation rejected', { code: code || 'UNKNOWN' });
      const descriptor = userFacingMutationError(error, t);
      if (code === 'TASK_VERSION_CONFLICT' && task) {
        void feedback.error({ title: t('feedback.conflictTitle'), message: t('feedback.conflictDraftHelp'), importance: 'milestone', nextAction: { label: t('feedback.reloadKeepDraft'), onClick: async () => { try { await reloadLatest(true); } catch { void feedback.error({ title: t('feedback.networkTitle'), message: t('feedback.networkHelp'), importance: 'milestone' }); } } } });
      } else {
        void feedback.error({ title: descriptor.title, message: descriptor.message, importance: 'milestone' });
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assignedTo: undefined,
      priority: 'normal',
      watcherIds: [],
      dueDate: undefined,
      startDate: undefined,
      endDate: undefined,
      dueDateRange: undefined,
      status: 'draft',
      images: []
    });
    setImages([]);
    setFormErrors({});
  };

  return {
    // State
    formData,
    images,
    formErrors,
    conflictFields,
    isSubmitting,
    
    // Actions
    handleInputChange,
    handleImagesChange,
    handleSubmit,
    validateForm,
    resetForm,
    
    // Computed
    isValid: Object.keys(formErrors).length === 0,
    isEditing: !!task,
    users,
  };
};
