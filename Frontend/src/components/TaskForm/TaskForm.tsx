import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import { Task, User } from '../../api/task.api';
import { useTaskForm } from '../../hooks/useTaskForm';
import { TaskFormFields } from './TaskFormFields';

interface TaskFormProps {
  task?: Task;
  users: User[];
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  bookedDates?: Date[]; // New prop for booked dates
}

export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  users,
  open,
  onClose,
  onSave,
  bookedDates = []
}) => {
  const taskForm = useTaskForm({ task, users, onSave });

  const handleSubmit = async () => {
    try {
      // Show loading
      Swal.showLoading();
      Swal.fire({
        title: taskForm.isEditing ? 'Updating Task...' : 'Creating Task...',
        text: 'Please wait...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Call the async onSave function directly
      const taskData = {
        ...taskForm.formData,
        images: taskForm.images.map(img => ({
          imageUrl: img.imageUrl,
          imageOrder: img.imageOrder
        }))
      };

      await onSave(taskData as Task);
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: taskForm.isEditing ? 'Task Updated!' : 'Task Created!',
        text: taskForm.isEditing 
          ? 'Your task has been updated successfully.' 
          : 'Your task has been created successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      onClose();
    } catch (error) {
      // Show error message
      Swal.fire({
        icon: 'error',
        title: 'Operation Failed',
        text: taskForm.isEditing 
          ? 'Failed to update task. Please try again.' 
          : 'Failed to create task. Please try again.',
      });
    }
  };

  const handleCancel = () => {
    if (!taskForm.isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          {taskForm.isEditing ? 'Edit Task' : 'Create New Task'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <TaskFormFields
          formData={taskForm.formData}
          images={taskForm.images}
          users={users}
          formErrors={taskForm.formErrors}
          isSubmitting={taskForm.isSubmitting}
          onInputChange={taskForm.handleInputChange}
          onImagesChange={taskForm.handleImagesChange}
          bookedDates={bookedDates}
        />
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleCancel}
          disabled={taskForm.isSubmitting}
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={taskForm.isSubmitting}
          variant="contained"
          startIcon={taskForm.isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {taskForm.isEditing ? 'Update Task' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskForm;
