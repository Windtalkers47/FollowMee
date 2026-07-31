import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { CalendarMonthOutlined, ScheduleOutlined } from '@mui/icons-material';
import { Task } from '../../api/task.api';
import SmartAvatar from '../SmartAvatar';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedDate, formatLocalizedRelativeTime } from '../../utils/localeFormat';

interface TaskMetaProps {
  task: Task;
}

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1.25,
  py: 0.5,
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'action.hover',
};

const TaskMeta: React.FC<TaskMetaProps> = ({ task }) => {
  const { locale, t } = useUserPreferences();
  const shortDate = (value: string) => formatLocalizedDate(value, locale, { month: 'short', day: '2-digit' });
  return (
  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
    {task.startDate && task.endDate ? (
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={badgeStyle}>
        <CalendarMonthOutlined sx={{ fontSize: 16 }} aria-hidden="true" />
        {shortDate(task.startDate)} – {shortDate(task.endDate)}
      </Typography>
    ) : task.dueDate ? (
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={badgeStyle}>
        <ScheduleOutlined sx={{ fontSize: 16 }} aria-hidden="true" />
        {t('task.due')} {shortDate(task.dueDate)}
      </Typography>
    ) : null}

    {task.assignedToUser && (
      <Stack direction="row" spacing={0.75} alignItems="center" sx={badgeStyle}>
        <SmartAvatar user={task.assignedToUser} avatarVariant="main" size={20} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {task.assignedToUser.userName}
        </Typography>
      </Stack>
    )}

    <Box flex={1} />
    <Typography variant="caption" color="text.secondary" sx={badgeStyle}>
      {formatLocalizedRelativeTime(task.createdAt, locale)}
    </Typography>
  </Stack>
  );
};

export default React.memo(TaskMeta);
