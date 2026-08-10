import { useState } from 'react';
import { Alert, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Button } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { taskApi, type Task } from '../../api/task.api';
import feedback from '../../services/feedback.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface Props {
  task?: Task | null;
  open: boolean;
  onClose: () => void;
}

export default function DuplicateTaskDialog({ task, open, onClose }: Props) {
  const { t } = useUserPreferences();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const mutation = useMutation({
    mutationFn: () => taskApi.duplicateTask(task!.taskId, includeAttachments),
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
      setIncludeAttachments(false);
      feedback.success(t('feature.duplicateSuccess'), t('feature.duplicateSuccessHint'));
      navigate(`/tasks/${result.taskId}`);
    },
    onError: () => feedback.error(t('feedback.failed'), t('feedback.tryAgain')),
  });

  const close = () => {
    if (mutation.isPending) return;
    setIncludeAttachments(false);
    onClose();
  };

  return <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
    <DialogTitle>{t('feature.duplicateTask')}</DialogTitle>
    <DialogContent>
      <Alert severity="info" sx={{ mb: 2 }}>{t('feature.duplicateDraftHint')}</Alert>
      <FormControlLabel control={<Checkbox checked={includeAttachments} onChange={(_, checked) => setIncludeAttachments(checked)} />} label={t('feature.includeAttachments')} />
      {includeAttachments && <Alert severity="warning" variant="outlined">{t('feature.attachmentsPreparingHint')}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>{t('common.cancel')}</Button>
      <Button variant="contained" onClick={() => mutation.mutate()} disabled={!task || mutation.isPending}>{t('feature.duplicate')}</Button>
    </DialogActions>
  </Dialog>;
}
