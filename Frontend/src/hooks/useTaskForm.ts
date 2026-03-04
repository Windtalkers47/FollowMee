import { useState, useEffect } from 'react';
import { Task, TaskImage, CreateTaskData, User } from '../api/task.api';

interface UseTaskFormProps {
  task?: Task;
  users: User[];
  onSave: (task: Task) => void;
}

interface FormErrors {
  [key: string]: string | undefined;
}

export const useTaskForm = ({ task, users, onSave }: UseTaskFormProps) => {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    assignedTo: undefined,
    dueDate: undefined,
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
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        status: task.status,
        images: task.images || []
      });
      setImages(task.images || []);
    } else {
      setFormData({
        title: '',
        description: '',
        assignedTo: undefined,
        dueDate: undefined,
        status: 'draft',
        images: []
      });
      setImages([]);
    }
    setFormErrors({});
  }, [task]);

  const handleInputChange = (field: string, value: any) => {
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

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (formData.title.length > 255) {
      errors.title = 'Title must be less than 255 characters';
    }

    if (formData.description && formData.description.length > 2000) {
      errors.description = 'Description must be less than 2000 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
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
      onSave(taskData as Task);
      return true;
    } catch (error) {
      console.error('Failed to save task:', error);
      setFormErrors({ submit: 'Failed to save task. Please try again.' });
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
      dueDate: undefined,
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
    resetForm,
    
    // Computed
    isValid: Object.keys(formErrors).length === 0,
    isEditing: !!task,
    users
  };
};
