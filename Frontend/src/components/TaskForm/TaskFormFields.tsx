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
  Alert,
  FormHelperText,
  Checkbox,
  ListItemText
} from '@mui/material';
import { CreateTaskData, TaskImage, User } from '../../api/task.api';
import { ImageUpload } from '../ImageUpload/ImageUpload';
import { RangeCalendar } from '../RangeCalendar/RangeCalendar';
import { formatLocalizedRelativeTime } from '../../utils/localeFormat';
import { AccessTime, Update } from '@mui/icons-material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface TaskFormFieldsProps {
  formData: CreateTaskData;
  images: TaskImage[];
  users: User[];
  formErrors: Record<string, string | undefined>;
  isSubmitting: boolean;
  onInputChange: <K extends keyof CreateTaskData>(field: K, value: CreateTaskData[K]) => void;
  onImagesChange: (images: TaskImage[]) => void;
  bookedDates?: Date[]; // New prop for booked dates
}

export const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  formData,
  images,
  users,
  formErrors,
  isSubmitting,
  onInputChange,
  onImagesChange,
  bookedDates = []
}) => {
  const { t, locale } = useUserPreferences();
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
                <FormControl error={!!formErrors.assignedTo} sx={{ flex: 1, minWidth: 200 }}>
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
                  {formErrors.assignedTo && <FormHelperText>{formErrors.assignedTo}</FormHelperText>}
                </FormControl>
                <FormControl sx={{ flex: 1, minWidth: 180 }}>
                  <InputLabel id="priority-label">{t('task.form.priority')}</InputLabel>
                  <Select labelId="priority-label" value={formData.priority || 'normal'} label={t('task.form.priority')} onChange={(e) => onInputChange('priority', e.target.value)} disabled={isSubmitting}>
                    {(['low', 'normal', 'high', 'urgent'] as const).map(priority => <MenuItem key={priority} value={priority}>{t(`task.priority.${priority}`)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              <FormControl fullWidth>
                <InputLabel id="watchers-label">{t('task.form.watchers')}</InputLabel>
                <Select multiple labelId="watchers-label" value={formData.watcherIds || []} label={t('task.form.watchers')} onChange={(e) => onInputChange('watcherIds', typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : e.target.value)} renderValue={(selected) => users.filter(user => (selected as number[]).includes(user.userId)).map(user => `${user.userName} ${user.userLastName}`).join(', ')} disabled={isSubmitting}>
                  {users.map(user => <MenuItem key={user.userId} value={user.userId}><Checkbox checked={(formData.watcherIds || []).includes(user.userId)} /><ListItemText primary={`${user.userName} ${user.userLastName}`} /></MenuItem>)}
                </Select>
              </FormControl>

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
                    {t('task.form.created')}: {formatLocalizedRelativeTime(formData.createdAt, locale)}
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
                    {t('task.form.updated')}: {formatLocalizedRelativeTime(formData.updatedAt, locale)}
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
              maxImages={6}
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
