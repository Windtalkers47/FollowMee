import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Menu, MenuItem, Button, Checkbox,
  Dialog, DialogContent, DialogTitle, Tooltip, LinearProgress, useTheme, ButtonBase,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import feedback from '../../services/feedback.service';
import { Task, TaskLikeSummary } from '../../api/task.api';
import { getTaskPermissions } from '../../permissions/taskPermissions';
import { feedbackTokens, taskStatusTokens, type TaskStatus } from '../../styles/designTokens';
import { differenceInCalendarDays, isToday, isValid } from 'date-fns';
import { getResponsiveImageProps } from '../../utils/imageUtils';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedDate } from '../../utils/localeFormat';
import type { MessageKey } from '../../i18n/messages';

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
  onDuplicate?: (task: Task) => void;
  isFocused?: boolean;
}

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

const dueMeta = (task: Task, locale: 'en' | 'th', t: Translate) => {
  const raw = task.endDate || task.dueDate;
  if (!raw) return { label: t('scheduleCard.noDueDate'), color: 'text.secondary', date: null, days: null };
  const date = new Date(raw);
  if (!isValid(date)) return { label: t('scheduleCard.noDueDate'), color: 'text.secondary', date: null, days: null };
  const days = differenceInCalendarDays(date, new Date());
  if (days < 0) return { label: t('scheduleCard.overdueDays', { count: Math.abs(days) }), color: feedbackTokens.error, date, days };
  if (isToday(date)) return { label: t('scheduleCard.dueToday'), color: feedbackTokens.warning, date, days: 0 };
  if (days <= 3) return { label: t('scheduleCard.dueInDays', { count: days }), color: feedbackTokens.warning, date, days };
  return { label: t('scheduleCard.dueDate', { date: formatLocalizedDate(date, locale) }), color: 'text.secondary', date, days };
};

const timelineFor = (task: Task, t: Translate) => {
  if (task.status === 'done') return { value: 100, label: t('scheduleCard.completed') };
  if (!task.startDate || !(task.endDate || task.dueDate)) return null;
  const start = new Date(task.startDate).getTime();
  const end = new Date((task.endDate || task.dueDate) as string).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const value = Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)));
  return { value, label: t('scheduleCard.timelineElapsed') };
};

const ScheduleTaskCard: React.FC<Props> = ({
  task, currentUserId, onEdit, onDelete, onStartProgress, onCancel,
  onUpdateTaskStatus, isSelected = false, onToggleSelect, isInSelectionMode = false,
  onCardClick,
  onDuplicate,
  isFocused = false,
}) => {
  const theme = useTheme();
  const { locale, t } = useUserPreferences();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const permissions = useMemo(() => getTaskPermissions({ userId: currentUserId, task }), [currentUserId, task]);
  const status = taskStatusTokens[task.status as TaskStatus] || taskStatusTokens.draft;
  const due = dueMeta(task, locale, t);
  const timeline = timelineFor(task, t);
  const images = (task.images || []).slice().sort((a, b) => a.imageOrder - b.imageOrder);
  const visibleImages = images.slice(0, 4);
  const handleCardClick = () => isInSelectionMode ? onToggleSelect?.(task.taskId) : onCardClick?.();
  const handleArticleClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, [role="menuitem"], [data-task-interactive="true"]')) return;
    handleCardClick();
  };
  const titleId = `schedule-task-title-${task.taskId}`;

  const confirmDelete = async () => {
    setAnchorEl(null);
    const result = await feedback.fire({ title: t('scheduleCard.deleteTitle'), text: t('scheduleCard.deleteMessage', { title: task.title }), icon: 'warning', showCancelButton: true, confirmButtonText: t('scheduleCard.deleteTask'), cancelButtonText: t('scheduleCard.keepTask'), reverseButtons: true });
    if (result.isConfirmed) onDelete(task.taskId);
  };

  return <>
    <Box component="article" tabIndex={-1} aria-labelledby={titleId} aria-selected={isInSelectionMode ? isSelected : undefined} data-testid={`task-card-${task.taskId}`} onClick={onCardClick ? handleArticleClick : undefined} sx={{ height: '100%', minHeight: 360, p: { xs: 2, sm: 2.5 }, borderRadius: 3, position: 'relative', backgroundColor: isSelected ? (theme.palette.mode === 'dark' ? 'rgba(52,199,89,.14)' : '#F0FBF2') : isFocused ? 'action.selected' : 'background.paper', border: isSelected || isFocused ? '2px solid' : '1px solid', borderColor: isSelected ? feedbackTokens.success : isFocused ? 'primary.main' : 'divider', boxShadow: isFocused ? `0 0 0 4px ${theme.palette.primary.main}22` : 'none', transition: 'border-color .2s, background-color .2s, box-shadow .2s', cursor: onCardClick && !isInSelectionMode ? 'pointer' : 'default', '&:hover': { borderColor: isSelected ? feedbackTokens.success : 'text.secondary' }, '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 3 } }}>
      {images.length > 0 && <Box sx={{ display: 'grid', gridTemplateColumns: visibleImages.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap: .5, mb: 2, borderRadius: 2, overflow: 'hidden', height: visibleImages.length === 1 ? 150 : 120 }}>
        {visibleImages.map((image, index) => <ButtonBase key={image.imageId} aria-label={t('scheduleCard.imageAlt', { title: task.title, count: index + 1 })} onClick={() => setLightbox(image.imageUrl)} sx={{ minWidth: 44, minHeight: 44, overflow: 'hidden', gridColumn: visibleImages.length === 3 && index === 0 ? 'span 2' : 'auto', '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: -3 } }}><Box component="img" {...getResponsiveImageProps(image.imageUrl, '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 320px')} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /></ButtonBase>)}
        {images.length > 4 && <Box sx={{ position: 'absolute', mt: 9, ml: 'calc(100% - 74px)', bgcolor: 'rgba(0,0,0,.68)', color: '#fff', borderRadius: 1, px: 1, py: .5, fontSize: 12 }}>+{images.length - 4}</Box>}
      </Box>}

      <Box display="flex" alignItems="flex-start" gap={1} mb={1.5}>
        {isInSelectionMode && <Checkbox checked={isSelected} onChange={() => onToggleSelect?.(task.taskId)} inputProps={{ 'aria-label': t('scheduleCard.selectTask', { title: task.title }) }} sx={{ width: 44, height: 44, mt: -.75, ml: -.75, color: 'text.secondary', '&.Mui-checked': { color: feedbackTokens.success } }} />}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box display="flex" gap={.75} flexWrap="wrap" mb={.75}>
            <Chip label={t(`taskStatus.${task.status === 'in_progress' ? 'inProgress' : task.status}` as MessageKey)} size="small" sx={{ bgcolor: theme.palette.mode === 'dark' ? status.softDark : status.softLight, color: theme.palette.mode === 'dark' ? '#F4F7F5' : '#24352A', fontWeight: 700, height: 24, border: '1px solid', borderColor: `${status.color}55` }} />
            {due.days !== null && <Chip icon={<CalendarIcon sx={{ fontSize: 14 }} />} label={due.label} size="small" variant="outlined" sx={{ color: due.color, borderColor: due.color.startsWith('#') ? `${due.color}55` : 'divider', height: 24 }} />}
          </Box>
          <ButtonBase aria-label={t('scheduleCard.openTask', { title: task.title })} onClick={handleCardClick} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleCardClick(); } }} sx={{ display: 'flex', width: '100%', minHeight: 44, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 1, '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 2 } }}>
            <Typography id={titleId} variant="h6" fontWeight={750} sx={{ overflowWrap: 'anywhere', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.title}</Typography>
          </ButtonBase>
        </Box>
        <Tooltip title={t('scheduleCard.moreActions')}><IconButton aria-label={`${t('scheduleCard.moreActions')}: ${task.title}`} aria-haspopup="menu" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ width: 44, height: 44, mt: -.75, mr: -.75 }}><MoreVertIcon /></IconButton></Tooltip>
      </Box>

      {task.description && <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1.5 }}>{task.description}</Typography>}

      <Box sx={{ display: 'grid', gap: .75, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={.75}><PersonIcon sx={{ fontSize: 17 }} />{t('scheduleCard.assignedTo')} <strong>{task.assignedToUser?.userName || t('scheduleCard.unassigned')}</strong></Typography>
        <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={.75}><AssignmentIndIcon sx={{ fontSize: 17 }} />{t('scheduleCard.createdBy')} <strong>{task.createdByUser?.userName || t('scheduleCard.unknownUser')}</strong></Typography>
        {due.date && <Typography variant="caption" color="text.secondary">{formatLocalizedDate(due.date, locale)}</Typography>}
      </Box>

      {timeline !== null && <Box sx={{ mb: 1.5 }}><Box display="flex" justifyContent="space-between" mb={.5}><Typography variant="caption" color="text.secondary">{timeline.label}</Typography><Typography variant="caption" fontWeight={700}>{timeline.value}%</Typography></Box><LinearProgress variant="determinate" value={timeline.value} color={due.days !== null && due.days < 0 ? 'error' : 'success'} sx={{ height: 6, borderRadius: 999 }} /></Box>}
      <Box sx={{ flex: 1 }} />
      {onStartProgress && permissions.canStart && !isInSelectionMode && <Button fullWidth variant="outlined" color="primary" startIcon={<CheckIcon />} onClick={(e) => { e.stopPropagation(); onStartProgress(task.taskId); }} sx={{ minHeight: 44, textTransform: 'none', borderRadius: 2 }}>{t('scheduleCard.startWorking')}</Button>}
      {isInSelectionMode && <Typography variant="caption" color="text.secondary" textAlign="center">{isSelected ? t('scheduleCard.selected') : t('scheduleCard.tapToSelect')}</Typography>}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => { onEdit(task); setAnchorEl(null); }} disabled={!permissions.canEdit}><EditIcon fontSize="small" sx={{ mr: 1.5 }} />{t('scheduleCard.editTask')}</MenuItem>
        {task.workflow?.canDuplicate && onDuplicate && <MenuItem onClick={() => { onDuplicate(task); setAnchorEl(null); }}><ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />{t('feature.duplicateTask')}</MenuItem>}
        {task.status === 'draft' && onUpdateTaskStatus && (
          <MenuItem
            onClick={() => { onUpdateTaskStatus(task.taskId, 'todo'); setAnchorEl(null); }}
            disabled={!task.workflow?.canPublish}
          >
            <ArrowForwardIcon fontSize="small" sx={{ mr: 1.5 }} />{t('scheduleCard.publishTask')}
          </MenuItem>
        )}
        {task.status === 'review' && onUpdateTaskStatus && (
          <MenuItem
            onClick={() => { onUpdateTaskStatus(task.taskId, 'todo'); setAnchorEl(null); }}
            disabled={!task.workflow?.canEdit}
          >
            <ArrowForwardIcon fontSize="small" sx={{ mr: 1.5 }} />{t('task.moveTodo')}
          </MenuItem>
        )}
        {onCardClick && <MenuItem onClick={() => { onCardClick(); setAnchorEl(null); }}><VisibilityIcon fontSize="small" sx={{ mr: 1.5 }} />{t('task.view')}</MenuItem>}
        {task.status !== 'cancelled' && onCancel && <MenuItem onClick={() => { onCancel(task.taskId); setAnchorEl(null); }} disabled={!permissions.canCancel}><CancelIcon fontSize="small" sx={{ mr: 1.5 }} />{t('scheduleCard.cancelTask')}</MenuItem>}
        <MenuItem onClick={() => void confirmDelete()} disabled={!permissions.canDelete} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />{t('scheduleCard.deleteTask')}</MenuItem>
      </Menu>
    </Box>
    <Dialog open={Boolean(lightbox)} onClose={() => setLightbox(null)} maxWidth="lg"><DialogTitle sx={{ pr: 6 }}>{task.title}<IconButton aria-label={t('scheduleCard.closePreview')} onClick={() => setLightbox(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle><DialogContent sx={{ p: 1 }}><Box component="img" src={lightbox || ''} alt={t('scheduleCard.fullPreviewAlt', { title: task.title })} sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain' }} /></DialogContent></Dialog>
  </>;
};

export default ScheduleTaskCard;
