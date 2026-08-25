import type { NotificationRecipient } from '../types/notification.types';

export const mergeNotificationRecipients = (current: NotificationRecipient[], incoming: NotificationRecipient[]) => {
  const byId = new Map(current.map(item => [item.recipientId, item]));
  incoming.forEach(item => byId.set(item.recipientId, item));
  return [...byId.values()];
};
