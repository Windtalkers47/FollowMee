import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  TextField,
} from '@mui/material';
import {
  registerFeedbackPresenter,
  type FeedbackOptions,
  type FeedbackResult,
} from '../../services/feedback.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface PendingFeedback {
  options: FeedbackOptions;
  resolve: (result: FeedbackResult) => void;
}

const readableMessage = (options: FeedbackOptions) =>
  options.text || options.html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';

const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useUserPreferences();
  const [pending, setPending] = useState<PendingFeedback | null>(null);
  const [snackbar, setSnackbar] = useState<FeedbackOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const close = useCallback(() => {
    setPending((current) => {
      current?.resolve({ isConfirmed: false });
      return null;
    });
    setLoading(false);
  }, []);

  const present = useCallback((options: FeedbackOptions) => {
    const requiresDialog = Boolean(
      options.showCancelButton ||
      options.input ||
      options.allowOutsideClick === false ||
      options.allowEscapeKey === false ||
      (!options.timer && options.showConfirmButton !== false)
    );

    if (!requiresDialog) {
      setSnackbar(options);
      return Promise.resolve({ isConfirmed: true } satisfies FeedbackResult);
    }

    setInputValue(options.inputValue || '');
    setLoading(options.showConfirmButton === false && options.allowOutsideClick === false);
    return new Promise<FeedbackResult>((resolve) => setPending({ options, resolve }));
  }, []);

  useEffect(
    () => registerFeedbackPresenter(present, close, setLoading),
    [close, present],
  );

  const confirm = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      await pending.options.preConfirm?.();
      pending.resolve({ isConfirmed: true, value: pending.options.input ? inputValue : undefined });
      setPending(null);
    } catch (error) {
      setSnackbar({
        icon: 'error',
        title: t('feedback.failed'),
        text: error instanceof Error ? error.message : t('feedback.tryAgain'),
        timer: 4500,
      });
      pending.resolve({ isConfirmed: false });
      setPending(null);
    } finally {
      setLoading(false);
    }
  };

  const severity = snackbar?.icon === 'question' ? 'info' : snackbar?.icon || 'info';

  return (
    <>
      {children}
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={snackbar?.timer || 3500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setSnackbar(null)}
          sx={{ width: '100%', maxWidth: 440 }}
        >
          {snackbar?.title && <strong>{snackbar.title}</strong>}
          {snackbar?.title && readableMessage(snackbar) ? ' — ' : null}
          {readableMessage(snackbar || {})}
        </Alert>
      </Snackbar>
      <Dialog
        open={Boolean(pending)}
        onClose={loading || pending?.options.allowOutsideClick === false ? undefined : close}
        fullWidth
        maxWidth="xs"
        disableEscapeKeyDown={loading || pending?.options.allowEscapeKey === false}
        aria-labelledby="feedback-dialog-title"
      >
        <DialogTitle id="feedback-dialog-title">{pending?.options.title || t('feedback.confirmTitle')}</DialogTitle>
        <DialogContent>
          {readableMessage(pending?.options || {}) && (
            <DialogContentText>{readableMessage(pending?.options || {})}</DialogContentText>
          )}
          {pending?.options.input && (
            <TextField
              autoFocus
              fullWidth
              sx={{ mt: 2 }}
              label={pending.options.inputLabel}
              placeholder={pending.options.inputPlaceholder}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
          )}
          {loading && pending?.options.showConfirmButton === false && (
            <CircularProgress
              size={28}
              aria-label={t('feedback.working')}
              sx={{ display: 'block', mx: 'auto', mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {pending?.options.showCancelButton && (
            <Button color="inherit" disabled={loading} onClick={close}>
              {pending.options.cancelButtonText || t('feedback.cancel')}
            </Button>
          )}
          {pending?.options.showConfirmButton !== false && (
            <Button
              variant="contained"
              color={pending?.options.icon === 'warning' || pending?.options.icon === 'error' ? 'error' : 'primary'}
              disabled={loading}
              onClick={() => void confirm()}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              autoFocus
            >
              {pending?.options.confirmButtonText || t('feedback.confirm')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FeedbackProvider;
