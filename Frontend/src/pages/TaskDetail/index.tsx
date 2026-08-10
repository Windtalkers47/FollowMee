import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { ArrowBack, Block, CheckCircle, ContentCopy, Replay, Save, Repeat } from '@mui/icons-material';
import { commentApi, taskApi, Task } from '../../api/task.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import feedback from '../../services/feedback.service';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import SmartAvatar from '../../components/SmartAvatar';

const workflowSteps: Task['status'][] = ['draft', 'todo', 'in_progress', 'review', 'done'];
const statusKeys = {
  draft: 'taskStatus.draft',
  todo: 'taskStatus.todo',
  in_progress: 'taskStatus.inProgress',
  review: 'taskStatus.review',
  done: 'taskStatus.done',
  cancelled: 'taskStatus.cancelled',
} as const;

const TaskDetailPage = () => {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useUserPreferences();
  const [changesOpen, setChangesOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrence, setRecurrence] = useState({ cadence: 'weekly' as 'daily' | 'weekly' | 'monthly', intervalValue: 1, localTime: '09:00', startsOn: '' });

  const taskQuery = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => taskApi.getTaskById(taskId),
    enabled: Boolean(taskId),
    staleTime: 10_000,
  });
  const commentsQuery = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => commentApi.getTaskComments(taskId),
    enabled: Boolean(taskId),
    staleTime: 10_000,
  });

  const syncTask = (task: Task) => {
    queryClient.setQueryData(['task-detail', taskId], task);
    queryClient.invalidateQueries({ queryKey: ['my-work'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => taskApi.approveTask(taskId),
    onSuccess: ({ task }) => {
      syncTask(task);
      feedback.success({
        title: t('taskDetail.approved'),
        message: t('taskDetail.approvedHint'),
        importance: 'milestone',
        nextAction: { label: t('nav.activity'), onClick: () => navigate('/posts') },
      });
    },
    onError: () => feedback.error(t('feedback.failed'), t('feedback.tryAgain')),
  });

  const changesMutation = useMutation({
    mutationFn: () => taskApi.requestTaskChanges(taskId, reason.trim()),
    onSuccess: (task) => {
      syncTask(task);
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      setChangesOpen(false);
      setReason('');
      feedback.success({
        title: t('taskDetail.changesRequested'),
        message: t('taskDetail.changesRequestedHint'),
        importance: 'milestone',
        nextAction: { label: t('myWork.title'), onClick: () => navigate('/my-work') },
      });
    },
    onError: () => feedback.error(t('feedback.failed'), t('feedback.tryAgain')),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => taskApi.duplicateTask(taskId),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(`/tasks/${result.taskId}`);
      feedback.success('Task duplicated', 'A private draft was created without assignee, dates, comments, or rewards.');
    },
    onError: () => feedback.error(t('feedback.failed'), t('feedback.tryAgain')),
  });

  const checklistMutation = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: number; completed: boolean }) => taskApi.toggleChecklist(taskId, itemId, completed),
    onSuccess: checklist => queryClient.setQueryData(['task-detail', taskId], (current: Task | undefined) => current ? { ...current, checklist } : current),
    onError: () => feedback.error(t('feedback.failed'), t('feedback.tryAgain')),
  });

  const blockedMutation = useMutation({
    mutationFn: ({ blocked, reason, version }: { blocked: boolean; reason: string; version: number }) => taskApi.setBlocked(taskId, blocked, reason, version),
    onSuccess: async () => {
      setBlockOpen(false);
      setBlockReason('');
      await taskQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
    },
    onError: () => feedback.error(t('feedback.failed'), t('feedback.tryAgain')),
  });
  const templateMutation = useMutation({
    mutationFn: async ({ recurring }: { recurring: boolean }) => {
      const current = taskQuery.data!;
      const template = await taskApi.createTemplate({ name: current.title, title: current.title, description: current.description || undefined, priority: current.priority, defaultAssigneeId: current.assignedTo, checklist: (current.checklist || []).map(item => ({ label: item.label, isRequired: item.isRequired })), visibility: 'private' });
      if (recurring) await taskApi.createRecurrence({ templateId: template.templateId, ...recurrence, weekdays: recurrence.cadence === 'weekly' ? [new Date(`${recurrence.startsOn}T00:00:00+07:00`).getDay()] : undefined, dayOfMonth: recurrence.cadence === 'monthly' ? new Date(`${recurrence.startsOn}T00:00:00+07:00`).getDate() : undefined });
      return recurring;
    },
    onSuccess: recurring => { setRecurrenceOpen(false); feedback.success(recurring ? 'Recurring task created' : 'Template saved', recurring ? 'Occurrences use Asia/Bangkok time and are protected from duplicates.' : 'The private template is ready to reuse.'); },
    onError: () => feedback.error(t('feedback.failed'), t('feedback.tryAgain')),
  });

  const handleApprove = async () => {
    const result = await feedback.fire({
      icon: 'question',
      title: t('taskDetail.approveTitle'),
      text: t('taskDetail.approveQuestion'),
      showCancelButton: true,
      confirmButtonText: t('taskDetail.approve'),
      cancelButtonText: t('common.cancel'),
      reverseButtons: true,
    });
    if (result.isConfirmed) approveMutation.mutate();
  };

  if (taskQuery.isLoading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  if (taskQuery.error || !taskQuery.data) return <Alert severity="error">{t('taskDetail.loadFailed')}</Alert>;

  const task = taskQuery.data;
  const activeStep = task.status === 'cancelled' ? -1 : workflowSteps.indexOf(task.status);
  const nextActor = task.workflow?.nextActor;
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

  return (
    <Box sx={{ pb: { xs: 8, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>{t('common.back')}</Button>

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
            <Box>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h4" fontWeight={750}>{task.title}</Typography>
                <Chip label={t(statusKeys[task.status])} color={task.status === 'review' ? 'warning' : task.status === 'done' ? 'success' : 'primary'} />
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{task.description || t('myWork.noDescription')}</Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignSelf={{ sm: 'flex-start' }}>
              {task.workflow?.canDuplicate && (
                <Button variant="outlined" startIcon={<ContentCopy />} onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
                  {t('feature.duplicate')}
                </Button>
              )}
              {task.workflow?.canSaveTemplate && <Button variant="outlined" startIcon={<Save />} disabled={templateMutation.isPending} onClick={() => templateMutation.mutate({ recurring: false })}>{t('feature.saveTemplate')}</Button>}
              {task.workflow?.canManageRecurrence && <Button variant="outlined" startIcon={<Repeat />} onClick={() => setRecurrenceOpen(true)}>{t('feature.repeat')}</Button>}
              {task.workflow?.canSetBlocked && (
                <Button variant="outlined" color={task.blockedAt ? 'success' : 'warning'} startIcon={<Block />} onClick={() => task.blockedAt ? blockedMutation.mutate({ blocked: false, reason: '', version: task.version }) : setBlockOpen(true)}>
                  {task.blockedAt ? t('feature.unblock') : t('feature.markBlocked')}
                </Button>
              )}
              {task.workflow?.canApprove && (<>
                <Button variant="outlined" color="warning" startIcon={<Replay />} onClick={() => setChangesOpen(true)}>
                  {t('taskDetail.requestChanges')}
                </Button>
                <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleApprove} disabled={approveMutation.isPending}>
                  {t('taskDetail.approve')}
                </Button>
              </>)}
            </Stack>
          </Stack>

          {task.duplicatedFromTask && (
            <Alert severity="info" sx={{ mt: 2 }} action={<Button size="small" onClick={() => navigate(`/tasks/${task.duplicatedFromTask!.taskId}`)}>{t('feature.viewSource')}</Button>}>
              {t('feature.duplicatedFrom', { title: task.duplicatedFromTask.title })}
            </Alert>
          )}
          {task.blockedAt && <Alert severity="warning" sx={{ mt: 2 }}>{t('feature.blockedReasonValue', { reason: task.blockedReason || '' })}</Alert>}

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight={700} mb={1}>{t('taskDetail.workflow')}</Typography>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ overflowX: 'auto', pb: 1 }}>
            {workflowSteps.map((status) => <Step key={status}><StepLabel>{t(statusKeys[status])}</StepLabel></Step>)}
          </Stepper>
          {nextActor && (
            <Alert severity={nextActor.reason === 'approval_required' ? 'warning' : 'info'} sx={{ mt: 2 }}>
              {nextActor.reason === 'approval_required'
                ? t('taskDetail.waitingApproval', { name: nextActor.displayName })
                : t('taskDetail.waitingAssignee', { name: nextActor.displayName })}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          {(task.checklist || []).length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" fontWeight={700}>{t('feature.checklist')}</Typography>
                  <Chip size="small" label={`${task.checklist?.filter(item => item.isCompleted).length || 0}/${task.checklist?.length || 0}`} />
                </Stack>
                <Stack spacing={0.5}>
                  {task.checklist?.map(item => (
                    <Stack key={item.checklistItemId} direction="row" alignItems="center">
                      <Checkbox checked={item.isCompleted} disabled={!task.workflow?.canToggleChecklist || checklistMutation.isPending} onChange={(_, completed) => checklistMutation.mutate({ itemId: item.checklistItemId, completed })} />
                      <Typography sx={{ textDecoration: item.isCompleted ? 'line-through' : 'none', color: item.isCompleted ? 'text.secondary' : 'text.primary' }}>{item.label}</Typography>
                      {item.isRequired && <Chip size="small" color="warning" variant="outlined" label={t('feature.required')} sx={{ ml: 'auto' }} />}
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
          {(task.images || []).length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={1.5}>{t('taskDetail.attachments')}</Typography>
                <Grid container spacing={1.5}>
                  {task.images?.map((image) => (
                    <Grid key={image.imageId} size={{ xs: 12, sm: 6 }}>
                      <Box
                        component="a"
                        href={image.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'block' }}
                      >
                        <Box
                          component="img"
                          src={getOptimizedImageUrl(image.imageUrl, 720)}
                          alt={task.title}
                          loading="lazy"
                          sx={{ display: 'block', width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 2 }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>{t('taskDetail.feedback')}</Typography>
              {commentsQuery.isLoading ? <CircularProgress size={24} /> : (commentsQuery.data || []).length === 0 ? (
                <Typography color="text.secondary">{t('taskDetail.noFeedback')}</Typography>
              ) : (
                <Stack spacing={2}>
                  {commentsQuery.data?.map((comment) => (
                    <Stack key={comment.commentId} direction="row" gap={1.5}>
                      <SmartAvatar user={comment.user} size={40} />
                      <Box>
                        <Typography fontWeight={700}>{comment.user?.userName} {comment.user?.userLastName}</Typography>
                        <Typography>{comment.comment}</Typography>
                        <Typography variant="caption" color="text.secondary">{dateFormatter.format(new Date(comment.createdAt))}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>{t('taskDetail.peopleAndDates')}</Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('taskDetail.creator')}</Typography>
                  <Typography>{task.createdByUser ? `${task.createdByUser.userName} ${task.createdByUser.userLastName || ''}`.trim() : '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('taskDetail.assignee')}</Typography>
                  <Typography>{task.assignedToUser ? `${task.assignedToUser.userName} ${task.assignedToUser.userLastName || ''}`.trim() : '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('taskDetail.startDate')}</Typography>
                  <Typography>{task.startDate ? dateFormatter.format(new Date(task.startDate)) : '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('taskDetail.endDate')}</Typography>
                  <Typography>{task.endDate ? dateFormatter.format(new Date(task.endDate)) : '-'}</Typography>
                </Box>
              </Stack>
              {task.status === 'done' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {t('feature.completedSnapshot', { done: task.checklist?.filter(item => item.isCompleted).length || 0, total: task.checklist?.length || 0 })}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={changesOpen} onClose={() => !changesMutation.isPending && setChangesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('taskDetail.requestChanges')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>{t('taskDetail.requestChangesHint')}</Typography>
          <TextField
            autoFocus
            required
            multiline
            minRows={4}
            fullWidth
            label={t('taskDetail.reason')}
            value={reason}
            inputProps={{ maxLength: 1000 }}
            onChange={(event) => setReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setChangesOpen(false)} disabled={changesMutation.isPending}>{t('common.cancel')}</Button>
          <Button variant="contained" color="warning" onClick={() => changesMutation.mutate()} disabled={!reason.trim() || changesMutation.isPending}>
            {t('taskDetail.sendBack')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blockOpen} onClose={() => !blockedMutation.isPending && setBlockOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('feature.markBlocked')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>{t('feature.blockedHelp')}</Typography>
          <TextField autoFocus required multiline minRows={3} fullWidth label={t('feature.blockedReason')} value={blockReason} inputProps={{ maxLength: 500 }} onChange={event => setBlockReason(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setBlockOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="warning" disabled={!blockReason.trim() || blockedMutation.isPending} onClick={() => blockedMutation.mutate({ blocked: true, reason: blockReason, version: task.version })}>{t('feature.markBlocked')}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={recurrenceOpen} onClose={() => !templateMutation.isPending && setRecurrenceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('feature.createRecurring')}</DialogTitle><DialogContent><Stack gap={2} mt={1}><FormControl><InputLabel>{t('feature.frequency')}</InputLabel><Select label={t('feature.frequency')} value={recurrence.cadence} onChange={event => setRecurrence(value => ({ ...value, cadence: event.target.value as typeof value.cadence }))}><MenuItem value="daily">{t('feature.daily')}</MenuItem><MenuItem value="weekly">{t('feature.weekly')}</MenuItem><MenuItem value="monthly">{t('feature.monthly')}</MenuItem></Select></FormControl><TextField type="number" label={t('feature.every')} value={recurrence.intervalValue} inputProps={{ min: 1, max: 365 }} onChange={event => setRecurrence(value => ({ ...value, intervalValue: Math.max(1, Number(event.target.value)) }))} /><TextField type="date" label={t('feature.startDate')} InputLabelProps={{ shrink: true }} value={recurrence.startsOn} onChange={event => setRecurrence(value => ({ ...value, startsOn: event.target.value }))} /><TextField type="time" label={t('feature.bangkokTime')} InputLabelProps={{ shrink: true }} value={recurrence.localTime} onChange={event => setRecurrence(value => ({ ...value, localTime: event.target.value }))} /></Stack></DialogContent><DialogActions><Button onClick={() => setRecurrenceOpen(false)}>{t('common.cancel')}</Button><Button variant="contained" disabled={templateMutation.isPending || !recurrence.startsOn} onClick={() => templateMutation.mutate({ recurring: true })}>{t('feature.createRecurrence')}</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskDetailPage;
