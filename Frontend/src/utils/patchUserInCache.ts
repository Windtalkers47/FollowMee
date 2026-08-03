import type { UserProfileUpdatedEvent } from '../types/profile-event.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

export const patchUserInCache = (value: unknown, event: UserProfileUpdatedEvent): unknown => {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map(item => {
      const patched = patchUserInCache(item, event);
      changed ||= patched !== item;
      return patched;
    });
    return changed ? next : value;
  }
  if (!isRecord(value)) return value;

  const isTarget = Number(value.userId) === event.userId;
  let changed = isTarget;
  const next: Record<string, unknown> = isTarget
    ? { ...value, userName: event.userName, userLastName: event.userLastName,
        userImageUrl: event.userImageUrl, updatedAt: event.updatedAt }
    : { ...value };

  for (const [key, child] of Object.entries(value)) {
    const patched = patchUserInCache(child, event);
    if (patched !== child) {
      next[key] = patched;
      changed = true;
    }
  }
  return changed ? next : value;
};
