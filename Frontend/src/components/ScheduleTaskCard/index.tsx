import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Menu, MenuItem, Button, Checkbox,
  Dialog, DialogContent, DialogTitle, Tooltip, LinearProgress, useTheme,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon,
  CalendarToday as CalendarIcon, Person as PersonIcon, Cancel as CancelIcon,
  Check as CheckIcon, ArrowForward as ArrowForwardIcon, Close as CloseIcon,
  Image as ImageIcon, AssignmentInd as AssignmentIndIcon,
} from '@mui/icons-material';
import feedback from '../../services/feedback.service';
import { Task, TaskLikeSummary } from '../../api/task.api';
import { getTaskPermissions } from '../../permissions/taskPermissions';
import { feedbackTokens, taskStatusTokens, type TaskStatus } from '../../styles/designTokens';
import { differenceInCalendarDays, format, isToday, isValid, parseISO } from 'date-fns';
import { getResponsiveImageProps } from '../../utils/imageUtils';

interface Props {
  task: Task; likeSummary?: TaskLikeSummary; currentUserId: number;
  onEdit: (task: Task) => void; onDelete: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onApprove?: (taskId: string) => void; onReject?: (taskId: string) => void;
  onMarkDone?: (taskId: string) => void; onMarkUndone?: (taskId: string) => void;
  onUndo?: (taskId: string) => void;
  onStartProgress?: (taskId: string) => void; onCancel?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
  isSelected?: boolean; onToggleSelect?: (taskId: string) => void;
  isInSelectionMode?: boolean; onEnterSelectionMode?: () => void; onCardClick?: () => void;
}

const dueMeta = (task: Task) => {
  const raw = task.endDate || task.dueDate;
  if (!raw) return { label: 'No due date', color: 'text.secondary', date: null, days: null };
  const date = new Date(raw);
  if (!isValid(date)) return { label: 'No due date', color: 'text.secondary', date: null, days: null };
  const days = differenceInCalendarDays(date, new Date());
  if (days < 0) return { label: `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`, color: feedbackTokens.error, date, days };
  if (isToday(date)) return { label: 'Due today', color: feedbackTokens.warning, date, days: 0 };
  if (days <= 3) return { label: `Due in ${days} ${days === 1 ? 'day' : 'days'}`, color: feedbackTokens.warning, date, days };
  return { label: `Due ${format(date, 'MMM d, yyyy')}`, color: 'text.secondary', date, days };
};

const timelineFor = (task: Task) => {
  if (task.status === 'done') return { value: 100, label: 'Completed' };
  if (!task.startDate || !(task.endDate || task.dueDate)) return null;
  const start = new Date(task.startDate).getTime();
  const end = new Date((task.endDate || task.dueDate) as string).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const value = Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)));
  return { value, label: value >= 100 ? 'Timeline elapsed' : 'Timeline elapsed' };
};

const ScheduleTaskCard: React.FC<Props> = ({
  task, currentUserId, onEdit, onDelete, onStartProgress, onCancel,
  onUpdateTaskStatus, isSelected = false, onToggleSelect, isInSelectionMode = false,
  onEnterSelectionMode, onCardClick,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const permissions = useMemo(() => getTaskPermissions({ userId: currentUserId, task }), [currentUserId, task]);
  const status = taskStatusTokens[task.status as TaskStatus] || taskStatusTokens.draft;
  const due = dueMeta(task);
  const timeline = timelineFor(task);
  const images = (task.images || []).slice().sort((a, b) => a.imageOrder - b.imageOrder);
  const visibleImages = images.slice(0, 4);
  const handleCardClick = () => isInSelectionMode ? onToggleSelect?.(task.taskId) : onCardClick?.();

  const confirmDelete = async () => {
    setAnchorEl(null);
    const result = await feedback.fire({ title: 'Delete task?', text: `This will permanently remove “${task.title}”.`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete task', cancelButtonText: 'Keep task', reverseButtons: true });
    if (result.isConfirmed) onDelete(task.taskId);
  };

  return <>
    <Box data-testid={`task-card-${task.taskId}`} onClick={handleCardClick} sx={{ height: '100%', minHeight: 360, p: { xs: 2, sm: 2.5 }, borderRadius: 3, cursor: isInSelectionMode ? 'pointer' : 'pointer', position: 'relative', backgroundColor: isSelected ? (theme.palette.mode === 'dark' ? 'rgba(52,199,89,.14)' : '#F0FBF2') : 'background.paper', border: isSelected ? `2px solid ${feedbackTokens.success}` : '1px solid', borderColor: isSelected ? feedbackTokens.success : 'divider', transition: 'border-color .2s, background-color .2s', '&:hover': { borderColor: isSelected ? feedbackTokens.success : 'text.secondary' } }}>
      {images.length > 0 && <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'grid', gridTemplateColumns: visibleImages.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap: .5, mb: 2, borderRadius: 2, overflow: 'hidden', height: visibleImages.length === 1 ? 150 : 120 }}>
        {visibleImages.map((image, index) => <Box key={image.imageId} component="img" {...getResponsiveImageProps(image.imageUrl, '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 320px')} alt={`${task.title} image ${index + 1}`} loading="lazy" onClick={() => setLightbox(image.imageUrl)} sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in', gridColumn: visibleImages.length === 3 && index === 0 ? 'span 2' : 'auto' }} />)}
        {images.length > 4 && <Box sx={{ position: 'absolute', mt: 9, ml: 'calc(100% - 74px)', bgcolor: 'rgba(0,0,0,.68)', color: '#fff', borderRadius: 1, px: 1, py: .5, fontSize: 12 }}>+{images.length - 4}</Box>}
      </Box>}

      <Box display="flex" alignItems="flex-start" gap={1} mb={1.5}>
        {isInSelectionMode && <Checkbox checked={isSelected} onChange={() => onToggleSelect?.(task.taskId)} onClick={(e) => e.stopPropagation()} inputProps={{ 'aria-label': `Select ${task.title}` }} sx={{ p: .25, mt: -.3, color: 'text.secondary', '&.Mui-checked': { color: feedbackTokens.success } }} />}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box display="flex" gap={.75} flexWrap="wrap" mb={.75}>
            <Chip label={status.label} size="small" sx={{ bgcolor: theme.palette.mode === 'dark' ? status.softDark : status.softLight, color: theme.palette.mode === 'dark' ? '#F4F7F5' : '#24352A', fontWeight: 700, height: 24, border: '1px solid', borderColor: `${status.color}55` }} />
            {due.days !== null && <Chip icon={<CalendarIcon sx={{ fontSize: 14 }} />} label={due.label} size="small" variant="outlined" sx={{ color: due.color, borderColor: due.color.startsWith('#') ? `${due.color}55` : 'divider', height: 24 }} />}
          </Box>
          <Typography variant="h6" fontWeight={750} sx={{ lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.title}</Typography>
        </Box>
        <Tooltip title="More actions"><IconButton size="small" aria-label={`More actions for ${task.title}`} aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}><MoreVertIcon /></IconButton></Tooltip>
      </Box>

      {task.description && <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1.5 }}>{task.description}</Typography>}

      <Box sx={{ display: 'grid', gap: .75, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={.75}><PersonIcon sx={{ fontSize: 17 }} />Assigned to <strong>{task.assignedToUser?.userName || 'Unassigned'}</strong></Typography>
        <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={.75}><AssignmentIndIcon sx={{ fontSize: 17 }} />Created by <strong>{task.createdByUser?.userName || 'Unknown'}</strong></Typography>
        {due.date && <Typography variant="caption" color="text.secondary">{format(due.date, 'MMM d, yyyy')}</Typography>}
      </Box>

      {timeline !== null && <Box sx={{ mb: 1.5 }}><Box display="flex" justifyContent="space-between" mb={.5}><Typography variant="caption" color="text.secondary">{timeline.label}</Typography><Typography variant="caption" fontWeight={700}>{timeline.value}%</Typography></Box><LinearProgress variant="determinate" value={timeline.value} color={due.days !== null && due.days < 0 ? 'error' : 'success'} sx={{ height: 6, borderRadius: 999 }} /></Box>}
      <Box sx={{ flex: 1 }} />
      {onStartProgress && permissions.canStart && !isInSelectionMode && <Button fullWidth variant="outlined" color="primary" startIcon={<CheckIcon />} onClick={(e) => { e.stopPropagation(); onStartProgress(task.taskId); }} sx={{ minHeight: 44, textTransform: 'none', borderRadius: 2 }}>Start working</Button>}
      {isInSelectionMode && <Typography variant="caption" color="text.secondary" textAlign="center">{isSelected ? 'Selected' : 'Tap to select'}</Typography>}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => { onEdit(task); setAnchorEl(null); }} disabled={!permissions.canEdit}><EditIcon fontSize="small" sx={{ mr: 1.5 }} />Edit task</MenuItem>
        {task.status === 'draft' && onUpdateTaskStatus && <MenuItem onClick={() => { onUpdateTaskStatus(task.taskId, 'todo'); setAnchorEl(null); }} disabled={!permissions.canEdit}><ArrowForwardIcon fontSize="small" sx={{ mr: 1.5 }} />Move to To do</MenuItem>}
        {task.status !== 'cancelled' && onCancel && <MenuItem onClick={() => { onCancel(task.taskId); setAnchorEl(null); }} disabled={!permissions.canCancel}><CancelIcon fontSize="small" sx={{ mr: 1.5 }} />Cancel task</MenuItem>}
        <MenuItem onClick={() => void confirmDelete()} disabled={!permissions.canDelete} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />Delete task</MenuItem>
      </Menu>
    </Box>
    <Dialog open={Boolean(lightbox)} onClose={() => setLightbox(null)} maxWidth="lg"><DialogTitle sx={{ pr: 6 }}>{task.title}<IconButton aria-label="Close image preview" onClick={() => setLightbox(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle><DialogContent sx={{ p: 1 }}><Box component="img" src={lightbox || ''} alt={`${task.title} full preview`} sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain' }} /></DialogContent></Dialog>
  </>;
};

export default ScheduleTaskCard;
