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
import { Task, User } from '../../api/task.api';
import { useTaskForm } from '../../hooks/useTaskForm';
import { TaskFormFields } from './TaskFormFields';

interface TaskFormProps {
  task?: Task;
  users: User[];
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  users,
  open,
  onClose,
  onSave
}) => {
  const taskForm = useTaskForm({ task, users, onSave });

  const handleSubmit = async () => {
    const success = await taskForm.handleSubmit();
    if (success) {
      onClose();
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
