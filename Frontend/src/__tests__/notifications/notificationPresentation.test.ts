import { describe, expect, it } from 'vitest';
import { messages, type MessageKey } from '../../i18n/messages';
import {
  getNotificationPresentation,
  getNotificationTypeLabel,
} from '../../utils/notificationPresentation';
import type { Notification } from '../../types/notification.types';

const translate = (locale: 'en' | 'th') =>
  (key: MessageKey, values?: Record<string, string | number>) => {
    let output = messages[locale][key];
    Object.entries(values || {}).forEach(([name, value]) => {
      output = output.replaceAll(`{${name}}`, String(value));
    });
    return output;
  };

const base: Notification = {
  notificationId: 1,
  notificationType: 'TASK_ASSIGNED',
  title: 'Legacy title',
  message: 'Legacy message',
  isSystem: false,
  isGlobal: false,
  createdAt: '2026-07-31T00:00:00.000Z',
};

describe('notification presentation', () => {
  it('renders a new notification from its translation contract', () => {
    const notification = {
      ...base,
      titleKey: 'notification.content.taskAssigned.title',
      messageKey: 'notification.content.taskAssigned.message',
      translationParams: { actorName: 'Coca Cola', taskTitle: 'Feature 001' },
    };

    const result = getNotificationPresentation(notification, translate('th'));
    expect(result.title).toBe(messages.th['notification.content.taskAssigned.title']);
    expect(result.message).toContain('Feature 001');
  });

  it('uses a localized generic presentation for a known legacy type', () => {
    expect(getNotificationPresentation(base, translate('th'))).toEqual({
      title: getNotificationTypeLabel('TASK_ASSIGNED', translate('th')),
      message: messages.th['notification.content.legacy.message'],
    });
  });

  it('keeps fallback content for unknown and system notifications', () => {
    const unknown = { ...base, notificationType: 'CUSTOM_EVENT' };
    expect(getNotificationPresentation(unknown, translate('th'))).toEqual({
      title: 'Legacy title',
      message: 'Legacy message',
    });
  });
});
