import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { CreateTaskData, Task, User } from '../../api/task.api';
import { TaskSaveIntent, useTaskForm } from '../../hooks/useTaskForm';
import { TaskFormFields } from './TaskFormFields';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface TaskFormProps {
  task?: Task;
  users: User[];
  open: boolean;
  onClose: () => void;
  onSave: (task: CreateTaskData, intent: TaskSaveIntent) => Promise<void> | void;
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
  const { t } = useUserPreferences();
  const taskForm = useTaskForm({ task, users, onSave });
  const handleSubmit = async (intent: TaskSaveIntent) => {
    const saved = await taskForm.handleSubmit(intent);
    if (saved) onClose();
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
          {taskForm.isEditing ? t('task.form.editTask') : t('task.form.createTask')}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {taskForm.formErrors.submit && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{taskForm.formErrors.submit}</Alert>}
        <TaskFormFields
          formData={taskForm.formData}
          images={taskForm.images}
          users={users}
          formErrors={taskForm.formErrors}
          conflictFields={taskForm.conflictFields}
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
          {t('common.cancel')}
        </Button>
        
        {(!task || task.status === 'draft') && (
          <Button
            onClick={() => handleSubmit('draft')}
            disabled={taskForm.isSubmitting}
            variant="outlined"
            startIcon={taskForm.isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {t('task.form.saveDraft')}
          </Button>
        )}
        <Button
          onClick={() => handleSubmit(!task || task.status === 'draft' ? 'publish' : 'save')}
          disabled={taskForm.isSubmitting}
          variant="contained"
          startIcon={taskForm.isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {!task || task.status === 'draft' ? t('task.form.assignTask') : t('task.form.saveChanges')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskForm;
