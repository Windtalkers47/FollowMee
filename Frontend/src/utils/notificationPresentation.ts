import type { MessageKey } from '../i18n/messages';
import type { Notification } from '../types/notification.types';

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

const KNOWN_TYPES = new Set([
  'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_DEADLINE_NEAR', 'TASK_COMPLETED',
  'TASK_COMMENT', 'COMMENT_REPLY', 'TASK_LIKE', 'COMMENT_REACTION', 'MENTION',
  'TASK_IMAGE_UPLOADED', 'ROLE_CHANGED', 'PROFILE_UPDATED_BY_ADMIN', 'ACCOUNT_ACTIVATED',
  'SYSTEM_ANNOUNCEMENT', 'CUSTOMER_CREATED', 'CUSTOMER_ASSIGNED',
  'CUSTOMER_FOLLOW_UP',
]);

const isMessageKey = (value?: string): value is MessageKey =>
  Boolean(value && (
    value.startsWith('notification.content.')
    || value.startsWith('notificationType.')
  ));

export const getNotificationTypeLabel = (type: string, t: Translate): string =>
  t(KNOWN_TYPES.has(type)
    ? `notificationType.${type}` as MessageKey
    : 'notificationType.unknown');

export const getDeviceLabel = (device: string, t: Translate): string => {
  const normalized = device.toLowerCase();
  const key = ['desktop', 'mobile', 'tablet'].includes(normalized)
    ? `device.${normalized}` as MessageKey
    : 'device.unknown';
  return t(key);
};

export const getNotificationPresentation = (
  notification: Notification,
  t: Translate
): { title: string; message: string } => {
  const params = notification.translationParams;
  if (isMessageKey(notification.titleKey) && isMessageKey(notification.messageKey)) {
    return {
      title: t(notification.titleKey, params),
      message: t(notification.messageKey, params),
    };
  }

  if (
    KNOWN_TYPES.has(notification.notificationType)
    && notification.notificationType !== 'SYSTEM_ANNOUNCEMENT'
  ) {
    return {
      title: getNotificationTypeLabel(notification.notificationType, t),
      message: t('notification.content.legacy.message'),
    };
  }

  return { title: notification.title, message: notification.message };
};
