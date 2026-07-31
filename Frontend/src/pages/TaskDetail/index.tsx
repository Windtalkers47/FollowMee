import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
  Typography,
} from '@mui/material';
import { ArrowBack, CheckCircle, Replay } from '@mui/icons-material';
import { commentApi, taskApi, Task } from '../../api/task.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import feedback from '../../services/feedback.service';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

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
                <Chip label={task.status.replace('_', ' ')} color={task.status === 'review' ? 'warning' : task.status === 'done' ? 'success' : 'primary'} />
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{task.description || t('myWork.noDescription')}</Typography>
            </Box>
            {task.workflow?.canApprove && (
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignSelf={{ sm: 'flex-start' }}>
                <Button variant="outlined" color="warning" startIcon={<Replay />} onClick={() => setChangesOpen(true)}>
                  {t('taskDetail.requestChanges')}
                </Button>
                <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleApprove} disabled={approveMutation.isPending}>
                  {t('taskDetail.approve')}
                </Button>
              </Stack>
            )}
          </Stack>

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
                      <Avatar src={comment.user?.userImageUrl}>{comment.user?.userName?.charAt(0)}</Avatar>
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
    </Box>
  );
};

export default TaskDetailPage;
