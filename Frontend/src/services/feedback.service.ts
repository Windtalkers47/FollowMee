export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';
export type FeedbackIcon = FeedbackTone | 'question';

export interface FeedbackAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface FeedbackEntity {
  type: string;
  id: string | number;
  label?: string;
}

export interface OutcomeOptions {
  title: string;
  message?: string;
  nextAction?: FeedbackAction;
  entity?: FeedbackEntity;
  dedupeKey?: string;
  duration?: number;
}

export interface ErrorOptions extends OutcomeOptions {
  retryAction?: FeedbackAction;
  persistent?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  consequence?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm?: () => unknown | Promise<unknown>;
}

export interface PromptField {
  label: string;
  placeholder?: string;
  initialValue?: string;
}

export interface PromptOptions extends Omit<ConfirmOptions, 'destructive'> {
  field: PromptField;
  validate?: (value: string) => string | undefined;
}

export interface FeedbackResult {
  isConfirmed: boolean;
  value?: string;
}

export interface FeedbackOptions {
  title?: string;
  text?: string;
  html?: string;
  icon?: FeedbackIcon;
  timer?: number;
  timerProgressBar?: boolean;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  reverseButtons?: boolean;
  showLoaderOnConfirm?: boolean;
  allowOutsideClick?: boolean;
  allowEscapeKey?: boolean;
  input?: 'text';
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  preConfirm?: () => unknown | Promise<unknown>;
}

export type FeedbackRequest =
  | { kind: 'outcome'; tone: FeedbackTone; options: OutcomeOptions | ErrorOptions }
  | { kind: 'confirm'; options: ConfirmOptions }
  | { kind: 'prompt'; options: PromptOptions };

type Presenter = (request: FeedbackRequest) => Promise<FeedbackResult>;

let presenter: Presenter | null = null;

export const registerFeedbackPresenter = (nextPresenter: Presenter) => {
  presenter = nextPresenter;
  return () => {
    if (presenter === nextPresenter) presenter = null;
  };
};

const present = async (request: FeedbackRequest): Promise<FeedbackResult> => {
  if (!presenter) {
    if (request.kind === 'outcome' && request.tone === 'error') {
      console.error(request.options.title, request.options.message);
    }
    return { isConfirmed: false };
  }
  return presenter(request);
};

const stripHtml = (value?: string) =>
  value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const fire = async (
  optionsOrTitle: FeedbackOptions | string,
  text?: string,
  icon?: FeedbackIcon,
): Promise<FeedbackResult> => {
  const options = typeof optionsOrTitle === 'string'
    ? { title: optionsOrTitle, text, icon }
    : optionsOrTitle;
  const message = options.text || stripHtml(options.html) || '';

  if (options.input) {
    return present({
      kind: 'prompt',
      options: {
        title: options.title || 'Enter details',
        message,
        confirmLabel: options.confirmButtonText || 'Confirm',
        cancelLabel: options.cancelButtonText || 'Cancel',
        field: {
          label: options.inputLabel || '',
          placeholder: options.inputPlaceholder,
          initialValue: options.inputValue,
        },
      },
    });
  }

  if (options.showCancelButton) {
    return present({
      kind: 'confirm',
      options: {
        title: options.title || 'Confirm action',
        message,
        confirmLabel: options.confirmButtonText || 'Confirm',
        cancelLabel: options.cancelButtonText || 'Cancel',
        destructive: options.icon === 'warning' || options.icon === 'error',
        onConfirm: options.preConfirm,
      },
    });
  }

  // Legacy loading popups are intentionally ignored. Mutations now expose
  // progress in their button/form instead of blocking the whole application.
  if (options.showConfirmButton === false && options.allowOutsideClick === false && !options.timer) {
    return { isConfirmed: true };
  }

  const tone: FeedbackTone = options.icon === 'question' ? 'info' : options.icon || 'info';
  return present({
    kind: 'outcome',
    tone,
    options: {
      title: options.title || (tone === 'error' ? 'Something went wrong' : 'Updated'),
      message,
      duration: options.timer,
    },
  });
};

const normalizeOutcome = (
  optionsOrTitle: OutcomeOptions | string,
  message?: string,
): OutcomeOptions =>
  typeof optionsOrTitle === 'string'
    ? { title: optionsOrTitle, message }
    : optionsOrTitle;

export const feedback = {
  success: (options: OutcomeOptions | string, message?: string) =>
    present({ kind: 'outcome', tone: 'success', options: normalizeOutcome(options, message) }),
  info: (options: OutcomeOptions | string, message?: string) =>
    present({ kind: 'outcome', tone: 'info', options: normalizeOutcome(options, message) }),
  warning: (options: OutcomeOptions | string, message?: string) =>
    present({ kind: 'outcome', tone: 'warning', options: normalizeOutcome(options, message) }),
  error: (options: ErrorOptions | string, message?: string) =>
    present({ kind: 'outcome', tone: 'error', options: normalizeOutcome(options, message) }),
  confirm: (options: ConfirmOptions | Omit<FeedbackOptions, 'showCancelButton'>) => {
    if ('confirmLabel' in options) return present({ kind: 'confirm', options });
    return fire({ ...options, showCancelButton: true });
  },
  prompt: (options: PromptOptions) => present({ kind: 'prompt', options }),
  fire,
  // Compatibility no-ops while legacy call sites are migrated to inline loading.
  showLoading: () => undefined,
  hideLoading: () => undefined,
  close: () => undefined,
  stopTimer: () => undefined,
  resumeTimer: () => undefined,
};

export default feedback;
