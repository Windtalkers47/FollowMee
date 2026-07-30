import feedback, {
  type FeedbackIcon,
  type OutcomeOptions,
} from '../services/feedback.service';

export interface ToastOptions {
  title?: string;
  text?: string;
  icon?: FeedbackIcon;
  timer?: number;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export const showToast = (options: ToastOptions) => {
  const outcome: OutcomeOptions = {
    title: options.title || 'Updated',
    message: options.text,
    duration: options.timer ?? 3000,
  };
  switch (options.icon) {
    case 'success': return feedback.success(outcome);
    case 'error': return feedback.error(outcome);
    case 'warning': return feedback.warning(outcome);
    default: return feedback.info(outcome);
  }
};

export const showSuccess = (title: string, text?: string) =>
  feedback.success({ title, message: text, duration: 3000 });

export const showError = (title: string, text?: string) =>
  feedback.error({ title, message: text, duration: 5000 });

export const showWarning = (title: string, text?: string) =>
  feedback.warning({ title, message: text, duration: 4000 });

export const showInfo = (title: string, text?: string) =>
  feedback.info({ title, message: text, duration: 3500 });

export const showConfirm = async (
  title: string,
  text = '',
  options?: Partial<ToastOptions>,
): Promise<boolean> => {
  const result = await feedback.confirm({
    title,
    message: text,
    confirmLabel: options?.confirmButtonText || 'Confirm',
    cancelLabel: options?.cancelButtonText || 'Cancel',
  });
  return result.isConfirmed;
};

export const showDeleteConfirm = async (itemName = 'this item'): Promise<boolean> => {
  const result = await feedback.confirm({
    title: 'Delete item?',
    message: `You are about to delete ${itemName}.`,
    consequence: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep item',
    destructive: true,
  });
  return result.isConfirmed;
};

// Loading belongs to the initiating control. These aliases remain temporarily
// so older callers do not display a blocking application-wide overlay.
export const showLoading = async () => ({ isConfirmed: true });
export const closeLoading = () => undefined;

export const showInput = async (
  title: string,
  inputLabel = '',
  inputValue = '',
  inputPlaceholder = '',
): Promise<string | null> => {
  const result = await feedback.prompt({
    title,
    message: '',
    field: { label: inputLabel, initialValue: inputValue, placeholder: inputPlaceholder },
    confirmLabel: 'Submit',
    cancelLabel: 'Cancel',
  });
  return result.isConfirmed ? result.value || '' : null;
};

export const showAnimatedSuccess = showSuccess;
export const showAnimatedError = showError;

export default {
  toast: showToast,
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  confirm: showConfirm,
  deleteConfirm: showDeleteConfirm,
  loading: showLoading,
  closeLoading,
  input: showInput,
  animatedSuccess: showAnimatedSuccess,
  animatedError: showAnimatedError,
};
