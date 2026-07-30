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
import feedback from '../../services/feedback.service';
import { Task, User } from '../../api/task.api';
import { useTaskForm } from '../../hooks/useTaskForm';
import { TaskFormFields } from './TaskFormFields';

interface TaskFormProps {
  task?: Task;
  users: User[];
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => Promise<void> | void;
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
      feedback.fire({
        title: taskForm.isEditing ? 'Updating Task...' : 'Creating Task...',
        text: 'Please wait...',
        allowOutsideClick: false,
        didOpen: () => {
          feedback.showLoading();
        }
      });

      // Call the async onSave function directly
      const saved = await taskForm.handleSubmit();
      if (!saved) {
        feedback.close();
        return;
      }
      
      // Show success message
      await feedback.fire({
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
      feedback.fire({
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
