import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slide, Typography } from '@mui/material';
import { CheckCircle as DoneIcon, EmojiEvents as TrophyIcon } from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';
import type { Task, UserRank } from '../api/task.api';
import type { MessageKey } from '../i18n/messages';

const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<unknown> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

type Outcome = { task: Task; newRank: UserRank } | null;
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

export default function CompletedWorkOutcomeDialogs({
  completed,
  reopened,
  t,
  onCloseCompleted,
  onCloseReopened,
}: {
  completed: Outcome;
  reopened: Outcome;
  t: Translate;
  onCloseCompleted: () => void;
  onCloseReopened: () => void;
}) {
  return <>
    <Dialog open={Boolean(completed)} TransitionComponent={SlideTransition} keepMounted onClose={onCloseCompleted} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <DoneIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="h6" color="success.main" fontWeight="bold" component="div">{t('activity.completedTitle')}</Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', py: 2 }}>
        {completed && <>
          <Typography variant="body1" sx={{ mb: 2 }}>{t('activity.completedText', { title: completed.task.title })}</Typography>
          <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2, border: 2, borderColor: 'success.main' }}>
            <Typography variant="h6" color="success.main" fontWeight="bold">{t('activity.newRank', { rank: completed.newRank.rank })}</Typography>
            <Typography variant="body2" color="text.secondary">{t('activity.completedTasks', { count: completed.newRank.completedTasks })}</Typography>
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              {completed.newRank.rank <= 3 ? t('activity.topThree') : t('activity.keepClimbing')}
            </Typography>
          </Box>
        </>}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}><Button onClick={onCloseCompleted} variant="contained" color="success" size="large">{t('activity.acknowledge')}</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(reopened)} TransitionComponent={SlideTransition} keepMounted onClose={onCloseReopened} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <TrophyIcon sx={{ fontSize: 44, mb: 1, color: 'primary.main' }} />
        <Typography variant="h6" color="warning.main" fontWeight="bold" component="div">{t('activity.reopenedTitle')}</Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', py: 2 }}>
        {reopened && <>
          <Typography variant="body1" sx={{ mb: 2 }}>{t('activity.reopenedText', { title: reopened.task.title })}</Typography>
          <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 2, border: 2, borderColor: 'warning.main' }}>
            <Typography variant="h6" color="warning.main" fontWeight="bold">{t('activity.currentRank', { rank: reopened.newRank.rank })}</Typography>
            <Typography variant="body2" color="text.secondary">{t('activity.completedTasks', { count: reopened.newRank.completedTasks })}</Typography>
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>{t('activity.takeTime')}</Typography>
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              {reopened.newRank.rank <= 3 ? t('activity.stillTopThree') : t('activity.setback')}
            </Typography>
          </Box>
        </>}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}><Button onClick={onCloseReopened} variant="contained" color="warning" size="large">{t('activity.gotIt')}</Button></DialogActions>
    </Dialog>
  </>;
}
