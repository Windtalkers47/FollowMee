import React from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert
} from '@mui/material';
import { TaskImage, User } from '../../api/task.api';
import { ImageUpload } from '../ImageUpload/ImageUpload';
import { RangeCalendar } from '../RangeCalendar/RangeCalendar';
import { formatRelativeTime } from '../../utils/dateUtils';
import { AccessTime, Update } from '@mui/icons-material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import type { TaskStatus } from '../../utils/taskWorkflow';

interface TaskFormFieldsProps {
  formData: any;
  images: TaskImage[];
  users: User[];
  formErrors: any;
  isSubmitting: boolean;
  onInputChange: (field: string, value: any) => void;
  onImagesChange: (images: TaskImage[]) => void;
  bookedDates?: Date[]; // New prop for booked dates
  allowedStatuses: TaskStatus[];
}

export const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  formData,
  images,
  users,
  formErrors,
  isSubmitting,
  onInputChange,
  onImagesChange,
  bookedDates = [],
  allowedStatuses
}) => {
  const { t } = useUserPreferences();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Basic Information */}
        <Card elevation={0} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {t('task.form.basic')}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label={t('task.form.title')}
                value={formData.title}
                onChange={(e) => onInputChange('title', e.target.value)}
                error={!!formErrors.title}
                helperText={formErrors.title}
                disabled={isSubmitting}
                placeholder={t('task.form.enterTitle')}
              />

              <TextField
                fullWidth
                label={t('task.form.description')}
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => onInputChange('description', e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
                disabled={isSubmitting}
                placeholder={t('task.form.enterDescription')}
              />

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ flex: 1, minWidth: 200 }}>
                  <InputLabel id="assigned-to-label">{t('task.form.assignedTo')}</InputLabel>
                  <Select
                    labelId="assigned-to-label"
                    id="assigned-to-select"
                    value={formData.assignedTo || ''}
                    label={t('task.form.assignedTo')}
                    onChange={(e) => onInputChange('assignedTo', e.target.value || undefined)}
                    disabled={isSubmitting}
                  >
                    <MenuItem value="">{t('task.form.unassigned')}</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.userId} value={user.userId}>
                        {user.userName} {user.userLastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ flex: 1, minWidth: 200 }}>
                  <InputLabel id="status-label">{t('task.form.status')}</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status-select"
                    value={formData.status}
                    label={t('task.form.status')}
                    onChange={(e) => onInputChange('status', e.target.value)}
                    disabled={isSubmitting}
                  >
                    {allowedStatuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {{ draft: 'Draft', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', cancelled: 'Cancelled' }[status]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 250 }}>
                  <RangeCalendar
                    value={formData.dueDateRange || [null, null]}
                    onChange={(range) => onInputChange('dueDateRange', range)}
                    disabled={isSubmitting}
                    error={!!formErrors.dueDateRange}
                    helperText={formErrors.dueDateRange}
                    label={formData.dueDateRange && formData.dueDateRange[0] && formData.dueDateRange[1] ? t('task.form.dateRange') : t('task.form.dueDate')}
                    bookedDates={bookedDates}
                  />
                </Box>
              </Box>
              
              {/* Time Information */}
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {formData.createdAt && (
                  <Typography variant="caption" color="text.secondary" sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    padding: '4px 8px',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}>
                    <AccessTime sx={{ fontSize: 15 }} aria-hidden="true" />
                    {t('task.form.created')}: {formatRelativeTime(formData.createdAt)}
                  </Typography>
                )}
                {formData.updatedAt && formData.updatedAt !== formData.createdAt && (
                  <Typography variant="caption" color="text.secondary" sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    padding: '4px 8px',
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}>
                    <Update sx={{ fontSize: 15 }} aria-hidden="true" />
                    {t('task.form.updated')}: {formatRelativeTime(formData.updatedAt)}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Images Section */}
        <Card elevation={0} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              {t('task.form.images')}
            </Typography>
            
            <ImageUpload
              images={images}
              onImagesChange={onImagesChange}
              maxImages={10}
              disabled={isSubmitting}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('task.form.imageHelp')}
            </Typography>
          </CardContent>
        </Card>

        {/* Error Display */}
        {formErrors.submit && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {formErrors.submit}
          </Alert>
        )}
      </Box>
  );
};
