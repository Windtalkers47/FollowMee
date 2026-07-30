import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Portal,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import {
  registerFeedbackPresenter,
  type ErrorOptions,
  type FeedbackRequest,
  type FeedbackResult,
  type FeedbackTone,
} from '../../services/feedback.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { feedbackSurfaceTokens, layoutTokens, radii, shadows } from '../../styles/designTokens';

interface QueuedModal {
  id: number;
  request: Extract<FeedbackRequest, { kind: 'confirm' | 'prompt' }>;
  resolve: (result: FeedbackResult) => void;
}

interface QueuedOutcome {
  id: number;
  tone: FeedbackTone;
  options: Extract<FeedbackRequest, { kind: 'outcome' }>['options'];
}

const toneIcons = {
  success: CheckRounded,
  info: InfoOutlined,
  warning: WarningAmberRounded,
  error: ErrorOutlineRounded,
};

const FollowMeeFeedbackProvider = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { t } = useUserPreferences();
  const location = useLocation();
  const nextId = useRef(0);
  const [modalQueue, setModalQueue] = useState<QueuedModal[]>([]);
  const [outcomeQueue, setOutcomeQueue] = useState<QueuedOutcome[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState('');
  const [paused, setPaused] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);
  const previousPath = useRef(location.pathname);
  const modalQueueRef = useRef<QueuedModal[]>([]);

  const modal = modalQueue[0];
  const outcome = outcomeQueue[0];

  const present = useCallback((request: FeedbackRequest) => {
    if (request.kind === 'outcome') {
      const dedupeKey = request.options.dedupeKey;
      setOutcomeQueue((current) => {
        if (dedupeKey && current.some((item) => item.options.dedupeKey === dedupeKey)) return current;
        return [...current, { id: ++nextId.current, tone: request.tone, options: request.options }];
      });
      return Promise.resolve({ isConfirmed: true } satisfies FeedbackResult);
    }

    return new Promise<FeedbackResult>((resolve) => {
      setModalQueue((current) => [
        ...current,
        { id: ++nextId.current, request, resolve },
      ]);
    });
  }, []);

  useEffect(() => registerFeedbackPresenter(present), [present]);

  useEffect(() => {
    modalQueueRef.current = modalQueue;
  }, [modalQueue]);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    modalQueueRef.current.forEach((item) => item.resolve({ isConfirmed: false }));
    setModalQueue([]);
    setOutcomeQueue([]);
  }, [location.pathname]);

  useEffect(() => {
    setInputValue(modal?.request.kind === 'prompt' ? modal.request.options.field.initialValue || '' : '');
    setValidationError('');
    setSubmittingModal(false);
  }, [modal?.id, modal?.request]);

  const dismissOutcome = useCallback(() => {
    setOutcomeQueue((current) => current.slice(1));
    setPaused(false);
  }, []);

  useEffect(() => {
    if (!outcome || paused) return;
    const errorOptions = outcome.options as ErrorOptions;
    if (errorOptions.persistent) return;
    const timer = window.setTimeout(
      dismissOutcome,
      outcome.options.duration ?? (outcome.tone === 'error' ? 6000 : 4800),
    );
    return () => window.clearTimeout(timer);
  }, [dismissOutcome, outcome, paused]);

  useEffect(() => () => {
    modalQueueRef.current.forEach((item) => item.resolve({ isConfirmed: false }));
  }, []);

  const closeModal = useCallback((result: FeedbackResult = { isConfirmed: false }) => {
    setModalQueue((current) => {
      current[0]?.resolve(result);
      return current.slice(1);
    });
  }, []);

  const confirmModal = async () => {
    if (!modal) return;
    if (modal.request.kind === 'prompt') {
      const error = modal.request.options.validate?.(inputValue);
      if (error) {
        setValidationError(error);
        return;
      }
      closeModal({ isConfirmed: true, value: inputValue });
      return;
    }
    if (modal.request.options.onConfirm) {
      setSubmittingModal(true);
      setValidationError('');
      try {
        await modal.request.options.onConfirm();
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : t('feedback.tryAgain'));
        setSubmittingModal(false);
        return;
      }
    }
    closeModal({ isConfirmed: true });
  };

  const visual = useMemo(() => {
    if (!outcome) return null;
    const palette = feedbackSurfaceTokens[theme.palette.mode][outcome.tone];
    const Icon = toneIcons[outcome.tone];
    return { palette, Icon };
  }, [outcome, theme.palette.mode]);

  const modalOptions = modal?.request.options;
  const destructive = modal?.request.kind === 'confirm' && modal.request.options.destructive;
  const retryAction = outcome?.tone === 'error'
    ? (outcome.options as ErrorOptions).retryAction
    : undefined;
  const action = retryAction || outcome?.options.nextAction;

  return (
    <>
      {children}
      {outcome && visual && (
        <Portal>
          <Box
            role={outcome.tone === 'error' ? 'alert' : 'status'}
            aria-live={outcome.tone === 'error' ? 'assertive' : 'polite'}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            sx={{
              position: 'fixed',
              zIndex: (muiTheme) => muiTheme.zIndex.modal + 30,
              top: { xs: 'auto', md: 84 },
              right: { xs: 12, md: 24 },
              bottom: {
                xs: 'calc(76px + env(safe-area-inset-bottom, 0px))',
                md: 'auto',
              },
              left: { xs: 12, md: 'auto' },
              width: { xs: 'auto', md: 400 },
              minHeight: 92,
              display: 'grid',
              gridTemplateColumns: '4px 40px 1fr 44px',
              overflow: 'hidden',
              color: visual.palette.text,
              bgcolor: visual.palette.surface,
              border: `1px solid ${visual.palette.border}`,
              borderRadius: radii.panel,
              boxShadow: theme.palette.mode === 'dark' ? shadows.floatingDark : shadows.floatingLight,
              animation: reduceMotion ? 'none' : `${isMobile ? 'followmee-outcome-up' : 'followmee-outcome-in'} 200ms ease-out`,
              '@keyframes followmee-outcome-in': {
                from: { opacity: 0, transform: 'translate3d(14px, -4px, 0)' },
                to: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
              },
              '@keyframes followmee-outcome-up': {
                from: { opacity: 0, transform: 'translate3d(0, 12px, 0)' },
                to: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
              },
            }}
          >
            <Box sx={{ bgcolor: visual.palette.accent }} />
            <Box sx={{ display: 'grid', placeItems: 'center', color: visual.palette.accent }}>
              <visual.Icon fontSize="small" />
            </Box>
            <Box sx={{ py: 1.5, pr: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 750, lineHeight: 1.3 }}>{outcome.options.title}</Typography>
              {outcome.options.message && (
                <Typography variant="body2" sx={{ mt: 0.35, color: visual.palette.secondaryText }}>
                  {outcome.options.message}
                </Typography>
              )}
              {action && (
                <Button
                  size="small"
                  startIcon={retryAction ? <ReplayRounded /> : undefined}
                  onClick={() => {
                    void action.onClick();
                    dismissOutcome();
                  }}
                  sx={{ mt: 0.75, minHeight: 36, px: 0, color: visual.palette.action }}
                >
                  {action.label}
                </Button>
              )}
            </Box>
            <IconButton
              aria-label={t('feedback.close')}
              onClick={dismissOutcome}
              sx={{ alignSelf: 'start', color: visual.palette.secondaryText }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </Box>
        </Portal>
      )}
      <Dialog
        open={Boolean(modal)}
        onClose={(_, reason) => {
          if (reason === 'backdropClick') return;
          closeModal();
        }}
        fullWidth
        maxWidth="xs"
        aria-labelledby="followmee-feedback-title"
        PaperProps={{
          sx: {
            m: { xs: 1.5, sm: 3 },
            width: { xs: 'calc(100% - 24px)', sm: 448 },
            maxWidth: 480,
            borderRadius: { xs: `${radii.panel}px ${radii.panel}px ${radii.modal}px ${radii.modal}px`, sm: radii.modal },
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: theme.palette.mode === 'dark' ? shadows.floatingDark : shadows.floatingLight,
            bgcolor: theme.palette.mode === 'dark' ? '#19211D' : '#FFFFFF',
          },
        }}
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.modal + 20,
          '& .MuiDialog-container': {
            alignItems: { xs: 'flex-end', sm: 'center' },
          },
        }}
      >
        <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: { xs: 3, sm: 3.5 }, pb: 1.5 }}>
          <Typography id="followmee-feedback-title" variant="h5">
            {modalOptions?.title || t('feedback.confirmTitle')}
          </Typography>
          {modalOptions?.message && (
            <Typography sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.6 }}>
              {modalOptions.message}
            </Typography>
          )}
          {'consequence' in (modalOptions || {}) && modalOptions?.consequence && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: destructive ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.primary.main, 0.07),
                borderRadius: radii.control,
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">{modalOptions.consequence}</Typography>
            </Box>
          )}
          {modal?.request.kind === 'prompt' && (
            <TextField
              autoFocus
              fullWidth
              sx={{ mt: 2.5 }}
              label={modal.request.options.field.label}
              placeholder={modal.request.options.field.placeholder}
              value={inputValue}
              error={Boolean(validationError)}
              helperText={validationError}
              onChange={(event) => {
                setInputValue(event.target.value);
                if (validationError) setValidationError('');
              }}
            />
          )}
          {modal?.request.kind === 'confirm' && validationError && (
            <Box
              role="alert"
              sx={{
                mt: 2,
                p: 1.5,
                color: 'error.main',
                bgcolor: alpha(theme.palette.error.main, 0.08),
                borderRadius: radii.control,
              }}
            >
              <Typography variant="body2">{validationError}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            px: { xs: 2.5, sm: 3.5 },
            pb: { xs: 'calc(20px + env(safe-area-inset-bottom, 0px))', sm: 3.5 },
          }}
        >
          <Button disabled={submittingModal} color="inherit" onClick={() => closeModal()} sx={{ minHeight: layoutTokens.mobileTapTarget }}>
            {modalOptions?.cancelLabel || t('feedback.cancel')}
          </Button>
          <Button
            variant="contained"
            color={destructive ? 'error' : 'primary'}
            onClick={() => void confirmModal()}
            disabled={submittingModal}
            startIcon={submittingModal ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ minHeight: layoutTokens.mobileTapTarget }}
          >
            {modalOptions?.confirmLabel || t('feedback.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FollowMeeFeedbackProvider;
