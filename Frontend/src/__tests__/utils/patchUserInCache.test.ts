import { describe, expect, it } from 'vitest';
import { patchUserInCache } from '../../utils/patchUserInCache';
import type { UserProfileUpdatedEvent } from '../../types/profile-event.types';

const event: UserProfileUpdatedEvent = {
  eventId: 'event-1',
  userId: 4,
  actorUserId: 1,
  userName: 'Coca',
  userLastName: 'Cola',
  userImageUrl: 'https://example.com/coca.webp',
  updatedAt: '2026-08-03T12:00:00.000Z',
};

describe('patchUserInCache', () => {
  it('updates only matching users across nested task and comment data', () => {
    const original = {
      tasks: [{
        taskId: 'task-1',
        assignedToUser: { userId: 4, userName: 'Old', userImageUrl: null },
        createdByUser: { userId: 1, userName: 'Admin', userImageUrl: null },
        comments: [{ user: { userId: 4, userName: 'Old' } }],
      }],
    };

    const patched = patchUserInCache(original, event) as typeof original;
    expect(patched.tasks[0].assignedToUser).toMatchObject({
      userId: 4,
      userName: 'Coca',
      userLastName: 'Cola',
      userImageUrl: event.userImageUrl,
    });
    expect(patched.tasks[0].comments[0].user.userName).toBe('Coca');
    expect(patched.tasks[0].createdByUser).toBe(original.tasks[0].createdByUser);
  });

  it('preserves the original reference when the user is absent', () => {
    const original = { users: [{ userId: 99, userName: 'Other' }] };
    expect(patchUserInCache(original, event)).toBe(original);
  });
});
