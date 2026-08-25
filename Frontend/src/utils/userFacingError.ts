import axios from 'axios';
import type { MessageKey } from '../i18n/messages';

export type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export const userFacingMutationError = (error: unknown, t: Translator): { title: string; message: string } => {
  if (!axios.isAxiosError(error) || !error.response) {
    return { title: t('feedback.networkTitle'), message: t('feedback.networkHelp') };
  }
  const status = error.response.status;
  const code = String((error.response.data as { code?: string; errorCode?: string } | undefined)?.code || (error.response.data as { errorCode?: string } | undefined)?.errorCode || '');
  if (status === 401 || status === 403) return { title: t('feedback.permissionTitle'), message: t('feedback.permissionHelp') };
  if (status === 409 || code.includes('VERSION') || code.includes('CONFLICT')) return { title: t('feedback.conflictTitle'), message: t('feedback.conflictHelp') };
  if (status === 400 || status === 422) return { title: t('feedback.validationTitle'), message: t('feedback.validationHelp') };
  return { title: t('feedback.failed'), message: t('feedback.tryAgain') };
};
