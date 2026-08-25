import { describe, expect, it } from 'vitest';
import { mergeNotificationRecipients } from '../../utils/mergeNotificationRecipients';
import type { NotificationRecipient } from '../../types/notification.types';

const recipient = (recipientId: number) => ({ recipientId } as NotificationRecipient);

describe('notification pagination merge', () => {
  it('appends a page without duplicating realtime or overlapping recipients', () => {
    expect(mergeNotificationRecipients([recipient(1), recipient(2)], [recipient(2), recipient(3)]).map(item => item.recipientId)).toEqual([1, 2, 3]);
  });
});
