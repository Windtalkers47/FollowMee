import Swal, { SweetAlertIcon, SweetAlertPosition } from 'sweetalert2';

export interface ToastOptions {
  title?: string;
  text?: string;
  icon?: SweetAlertIcon;
  position?: SweetAlertPosition;
  timer?: number;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  customClass?: {
    container?: string;
    popup?: string;
    title?: string;
    closeButton?: string;
    icon?: string;
    image?: string;
    content?: string;
    input?: string;
    actions?: string;
    confirmButton?: string;
    denyButton?: string;
    cancelButton?: string;
    loader?: string;
    footer?: string;
  };
}

// Toast for quick notifications
export const showToast = (options: ToastOptions) => {
  const defaultOptions = {
    toast: true,
    position: 'top-end' as SweetAlertPosition,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast: any) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
    customClass: {
      container: 'swal2-container-modern',
      popup: 'swal2-popup-modern',
      title: 'swal2-title-modern',
      content: 'swal2-content-modern',
    }
  };

  return Swal.fire({
    ...defaultOptions,
    ...options,
  });
};

// Success toast
export const showSuccess = (title: string, text?: string) => {
  return showToast({
    icon: 'success',
    title,
    text,
    timer: 3000,
    customClass: {
      popup: 'swal2-success-toast',
    }
  });
};

// Error toast
export const showError = (title: string, text?: string) => {
  return showToast({
    icon: 'error',
    title,
    text,
    timer: 4000,
    customClass: {
      popup: 'swal2-error-toast',
    }
  });
};

// Warning toast
export const showWarning = (title: string, text?: string) => {
  return showToast({
    icon: 'warning',
    title,
    text,
    timer: 3500,
    customClass: {
      popup: 'swal2-warning-toast',
    }
  });
};

// Info toast
export const showInfo = (title: string, text?: string) => {
  return showToast({
    icon: 'info',
    title,
    text,
    timer: 3000,
    customClass: {
      popup: 'swal2-info-toast',
    }
  });
};

// Confirmation dialog
export const showConfirm = async (
  title: string,
  text?: string,
  options?: Partial<ToastOptions>
): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, do it!',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    reverseButtons: true,
    customClass: {
      popup: 'swal2-confirm-dialog',
      confirmButton: 'swal2-confirm-button',
      cancelButton: 'swal2-cancel-button',
    },
    ...options,
  });

  return result.isConfirmed;
};

// Delete confirmation
export const showDeleteConfirm = async (itemName: string = 'this item'): Promise<boolean> => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: `You won't be able to revert ${itemName}!`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#d33',
    reverseButtons: true,
    customClass: {
      popup: 'swal2-delete-dialog',
    }
  });

  return result.isConfirmed;
};

// Loading dialog
export const showLoading = (title: string = 'Loading...') => {
  return Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
    customClass: {
      popup: 'swal2-loading-dialog',
    }
  });
};

// Close loading dialog
export const closeLoading = () => {
  Swal.close();
};

// Input dialog
export const showInput = async (
  title: string,
  inputLabel: string = '',
  inputValue: string = '',
  inputPlaceholder: string = ''
): Promise<string | null> => {
  const result = await Swal.fire({
    title,
    input: 'text',
    inputLabel,
    inputValue,
    inputPlaceholder,
    showCancelButton: true,
    confirmButtonText: 'Submit',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    customClass: {
      popup: 'swal2-input-dialog',
      confirmButton: 'swal2-confirm-button',
      cancelButton: 'swal2-cancel-button',
    }
  });

  return result.value as string | null;
};

// Custom animated success
export const showAnimatedSuccess = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    customClass: {
      popup: 'swal2-animated-success',
    },
    showClass: {
      popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    }
  });
};

// Custom animated error
export const showAnimatedError = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    showConfirmButton: true,
    confirmButtonText: 'OK',
    confirmButtonColor: '#dc3545',
    customClass: {
      popup: 'swal2-animated-error',
    },
    showClass: {
      popup: 'animate__animated animate__shakeX'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    }
  });
};

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
