export type FeedbackIcon = 'success' | 'error' | 'warning' | 'info' | 'question';

export interface FeedbackOptions {
  title?: string;
  text?: string;
  html?: string;
  icon?: FeedbackIcon;
  toast?: boolean;
  timer?: number;
  timerProgressBar?: boolean;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  background?: string;
  color?: string;
  reverseButtons?: boolean;
  showLoaderOnConfirm?: boolean;
  allowOutsideClick?: boolean;
  allowEscapeKey?: boolean;
  input?: 'text';
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  preConfirm?: () => unknown | Promise<unknown>;
  customClass?: unknown;
  showClass?: unknown;
  hideClass?: unknown;
  didOpen?: (element: HTMLElement) => void;
  position?: string;
}

export interface FeedbackResult {
  isConfirmed: boolean;
  value?: string;
}

type Presenter = (options: FeedbackOptions) => Promise<FeedbackResult>;

let presenter: Presenter | null = null;
let closeHandler: (() => void) | null = null;
let loadingHandler: ((loading: boolean) => void) | null = null;

export const registerFeedbackPresenter = (
  nextPresenter: Presenter,
  nextCloseHandler: () => void,
  nextLoadingHandler: (loading: boolean) => void,
) => {
  presenter = nextPresenter;
  closeHandler = nextCloseHandler;
  loadingHandler = nextLoadingHandler;
  return () => {
    presenter = null;
    closeHandler = null;
    loadingHandler = null;
  };
};

const fire = async (
  optionsOrTitle: FeedbackOptions | string,
  text?: string,
  icon?: FeedbackIcon,
): Promise<FeedbackResult> => {
  const options = typeof optionsOrTitle === 'string'
    ? { title: optionsOrTitle, text, icon }
    : optionsOrTitle;

  if (!presenter) {
    if (options.icon === 'error') console.error(options.title, options.text);
    return { isConfirmed: false };
  }
  return presenter(options);
};

export const feedback = {
  fire,
  success: (title: string, text?: string) => fire({ title, text, icon: 'success', timer: 3500, showConfirmButton: false }),
  error: (title: string, text?: string) => fire({ title, text, icon: 'error', timer: 4500, showConfirmButton: false }),
  warning: (title: string, text?: string) => fire({ title, text, icon: 'warning', timer: 4000, showConfirmButton: false }),
  confirm: (options: Omit<FeedbackOptions, 'showCancelButton'>) =>
    fire({ ...options, showCancelButton: true }),
  showLoading: () => loadingHandler?.(true),
  hideLoading: () => loadingHandler?.(false),
  close: () => closeHandler?.(),
  stopTimer: () => undefined,
  resumeTimer: () => undefined,
};

export default feedback;
