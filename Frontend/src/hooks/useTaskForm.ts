import { useState, useEffect } from 'react';
import { Task, TaskImage, CreateTaskData, User } from '../api/task.api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

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

  // Reset form when task changes
  useEffect(() => {
    if (task) {
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
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (intent: TaskSaveIntent = 'save') => {
    if (!validateForm(intent)) {
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
      console.error('Failed to save task:', error);
      setFormErrors({ submit: t('task.form.saveFailed') });
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
