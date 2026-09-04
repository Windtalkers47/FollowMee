import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTheme } from '@mui/material';
import { createPortal } from 'react-dom';
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
import { brandThemeTokens, feedbackSurfaceTokens, layoutTokens, radii, shadows } from '../../styles/designTokens';

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
  const { t, brandTheme } = useUserPreferences();
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
  const modalSurfaceRef = useRef<HTMLDivElement>(null);
  const remainingOutcomeDuration = useRef(0);
  const outcomeTimerStartedAt = useRef(0);

  const modal = modalQueue[0];
  const outcome = outcomeQueue[0];
  const visibleOutcome = modalQueue.length === 0 ? outcome : undefined;

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
    const dismissed = outcomeQueue[0];
    setOutcomeQueue((current) => current.slice(1));
    setPaused(false);
    dismissed?.options.onDismiss?.();
  }, [outcomeQueue]);

  useEffect(() => {
    if (!visibleOutcome) return;
    remainingOutcomeDuration.current = visibleOutcome.options.duration
      ?? (visibleOutcome.options.importance === 'milestone' ? 5000 : visibleOutcome.tone === 'error' ? 6000 : 4000);
    outcomeTimerStartedAt.current = 0;
    setPaused(false);
  }, [visibleOutcome?.id]);

  useEffect(() => {
    if (!visibleOutcome || paused) return;
    const errorOptions = visibleOutcome.options as ErrorOptions;
    if (errorOptions.persistent) return;
    outcomeTimerStartedAt.current = performance.now();
    const timer = window.setTimeout(dismissOutcome, remainingOutcomeDuration.current);
    return () => {
      window.clearTimeout(timer);
      if (outcomeTimerStartedAt.current > 0) {
        remainingOutcomeDuration.current = Math.max(
          0,
          remainingOutcomeDuration.current - (performance.now() - outcomeTimerStartedAt.current),
        );
        outcomeTimerStartedAt.current = 0;
      }
    };
  }, [dismissOutcome, paused, visibleOutcome]);

  useEffect(() => () => {
    modalQueueRef.current.forEach((item) => item.resolve({ isConfirmed: false }));
  }, []);

  const closeModal = useCallback((result: FeedbackResult = { isConfirmed: false }) => {
    setModalQueue((current) => {
      current[0]?.resolve(result);
      return current.slice(1);
    });
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingModal) {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab' || !modalSurfaceRef.current) return;
      const focusable = Array.from(modalSurfaceRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => modalSurfaceRef.current?.querySelector<HTMLElement>('input, button:not(:disabled)')?.focus(), 0);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeModal, modal, submittingModal]);

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
    if (!visibleOutcome) return null;
    const semantic = brandThemeTokens[brandTheme][theme.palette.mode];
    const palette = visibleOutcome.tone === 'success'
      ? {
          surface: semantic.muted,
          border: semantic.border,
          accent: semantic.action,
          text: semantic.text,
          secondaryText: semantic.secondaryText,
          action: semantic.action,
        }
      : feedbackSurfaceTokens[theme.palette.mode][visibleOutcome.tone];
    const Icon = toneIcons[visibleOutcome.tone];
    return { palette, Icon };
  }, [brandTheme, theme.palette.mode, visibleOutcome]);

  const modalOptions = modal?.request.options;
  const destructive = modal?.request.kind === 'confirm' && modal.request.options.destructive;
  const retryAction = visibleOutcome?.tone === 'error'
    ? (visibleOutcome.options as ErrorOptions).retryAction
    : undefined;
  const action = retryAction || visibleOutcome?.options.nextAction;
  const milestone = visibleOutcome?.options.importance === 'milestone';
  const semantic = brandThemeTokens[brandTheme][theme.palette.mode];

  const feedbackPortal = typeof document === 'undefined' ? null : document.body;
  return (
    <>
      {children}
      {feedbackPortal && visibleOutcome && visual && !milestone && createPortal(
        <div role={visibleOutcome.tone === 'error' ? 'alert' : 'status'} aria-live={visibleOutcome.tone === 'error' ? 'assertive' : 'polite'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ position: 'fixed', zIndex: 1600, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', width: 'min(420px, calc(100vw - 32px))', display: 'grid', gridTemplateColumns: '4px 40px 1fr 40px', overflow: 'hidden', color: visual.palette.text, background: visual.palette.surface, border: `1px solid ${visual.palette.border}`, borderRadius: radii.panel, boxShadow: theme.palette.mode === 'dark' ? shadows.floatingDark : shadows.floatingLight }}>
          <span style={{ background: visual.palette.accent }} />
          <span style={{ display: 'grid', placeItems: 'center', color: visual.palette.accent }}><visual.Icon fontSize="small" /></span>
          <div style={{ padding: '16px 8px 16px 0' }}>
            <strong>{visibleOutcome.options.title}</strong>
            {visibleOutcome.options.message && <p style={{ margin: '4px 0 0', color: visual.palette.secondaryText }}>{visibleOutcome.options.message}</p>}
            {action && <button type="button" onClick={() => { void action.onClick(); dismissOutcome(); }} style={{ marginTop: 8, border: 0, background: 'none', color: visual.palette.action, fontWeight: 700, cursor: 'pointer' }}>{retryAction && <ReplayRounded fontSize="small" />} {action.label}</button>}
          </div>
          <button type="button" aria-label={t('feedback.close')} onClick={dismissOutcome} style={{ alignSelf: 'start', margin: 6, border: 0, background: 'none', color: visual.palette.secondaryText, cursor: 'pointer' }}><CloseRounded fontSize="small" /></button>
        </div>, feedbackPortal,
      )}
      {feedbackPortal && visibleOutcome && visual && milestone && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="followmee-milestone-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ position: 'fixed', inset: 0, zIndex: 1550, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15, 18, 16, .48)' }}>
          <div style={{ position: 'relative', width: 'min(440px, 100%)', borderRadius: radii.modal, border: `1px solid ${semantic.border}`, background: semantic.panel, color: semantic.text, boxShadow: theme.palette.mode === 'dark' ? shadows.floatingDark : shadows.floatingLight, padding: '32px 32px 24px' }}>
            <div style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 12, background: semantic.muted, color: semantic.action }}><visual.Icon /></div>
            <button type="button" aria-label={t('feedback.close')} onClick={dismissOutcome} style={{ position: 'absolute', top: 10, right: 10, border: 0, background: 'none', color: semantic.secondaryText, cursor: 'pointer' }}><CloseRounded fontSize="small" /></button>
            <h2 id="followmee-milestone-title" style={{ margin: '18px 0 0', fontSize: 24 }}>{visibleOutcome.options.title}</h2>
            {visibleOutcome.options.message && <p style={{ margin: '10px 0 0', color: semantic.secondaryText, lineHeight: 1.65 }}>{visibleOutcome.options.message}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button type="button" onClick={dismissOutcome} style={{ minHeight: layoutTokens.mobileTapTarget, border: 0, background: 'none', color: semantic.secondaryText, fontWeight: 700, cursor: 'pointer' }}>{t('feedback.done')}</button>
              {action && <button type="button" onClick={() => { void action.onClick(); dismissOutcome(); }} style={{ minHeight: layoutTokens.mobileTapTarget, border: 0, borderRadius: 10, padding: '0 18px', background: semantic.action, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{action.label}</button>}
            </div>
          </div>
        </div>, feedbackPortal,
      )}
      {feedbackPortal && modal && createPortal(
        <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15, 18, 16, .48)' }}>
          <div ref={modalSurfaceRef} role="dialog" aria-modal="true" aria-labelledby="followmee-feedback-title" style={{ width: 'min(448px, 100%)', borderRadius: radii.modal, border: '1px solid #D8D1DD', background: theme.palette.mode === 'dark' ? '#19211D' : '#FFFFFF', color: theme.palette.text.primary, boxShadow: theme.palette.mode === 'dark' ? shadows.floatingDark : shadows.floatingLight, padding: '28px 28px 20px' }}>
            <h2 id="followmee-feedback-title" style={{ margin: 0, fontSize: 22 }}>{modalOptions?.title || t('feedback.confirmTitle')}</h2>
            {modalOptions?.message && <p style={{ margin: '10px 0 0', lineHeight: 1.6, color: theme.palette.text.secondary }}>{modalOptions.message}</p>}
            {'consequence' in (modalOptions || {}) && modalOptions?.consequence && <p style={{ margin: '16px 0 0', padding: 12, borderRadius: 10, background: destructive ? 'rgba(211, 47, 47, .08)' : 'rgba(111, 75, 128, .08)', color: theme.palette.text.secondary }}>{modalOptions.consequence}</p>}
            {modal?.request.kind === 'prompt' && <label style={{ display: 'grid', gap: 6, marginTop: 20 }}>{modal.request.options.field.label}<input autoFocus value={inputValue} placeholder={modal.request.options.field.placeholder} onChange={(event) => { setInputValue(event.target.value); if (validationError) setValidationError(''); }} style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${validationError ? theme.palette.error.main : '#CFC7D4'}`, padding: '0 12px', font: 'inherit' }} />{validationError && <span role="alert" style={{ color: theme.palette.error.main }}>{validationError}</span>}</label>}
            {modal?.request.kind === 'confirm' && validationError && <p role="alert" style={{ marginTop: 16, color: theme.palette.error.main }}>{validationError}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 24 }}><button type="button" disabled={submittingModal} onClick={() => closeModal()} style={{ minHeight: layoutTokens.mobileTapTarget, border: '1px solid #CFC7D4', borderRadius: 10, background: 'transparent', color: 'inherit', fontWeight: 700 }}>{modalOptions?.cancelLabel || t('feedback.cancel')}</button><button type="button" disabled={submittingModal} onClick={() => void confirmModal()} style={{ minHeight: layoutTokens.mobileTapTarget, border: 0, borderRadius: 10, background: destructive ? theme.palette.error.main : semantic.action, color: '#fff', fontWeight: 700 }}>{modalOptions?.confirmLabel || t('feedback.confirm')}</button></div>
          </div>
        </div>, feedbackPortal,
      )}
    </>
  );
};

export default FollowMeeFeedbackProvider;
