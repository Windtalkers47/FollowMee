export interface UserManagementErrorDescriptor {
  kind: 'network' | 'permission' | 'validation' | 'conflict' | 'unknown';
}

export class UserManagementRequestError extends Error {
  constructor(readonly status: number) {
    super('User management request failed');
  }
}

export const toUserManagementError = (error: unknown): UserManagementErrorDescriptor => {
  if (error instanceof UserManagementRequestError) {
    if (error.status === 401 || error.status === 403) return { kind: 'permission' };
    if (error.status === 400 || error.status === 422) return { kind: 'validation' };
    if (error.status === 409) return { kind: 'conflict' };
    return { kind: 'unknown' };
  }
  if (error instanceof TypeError) return { kind: 'network' };
  return { kind: 'unknown' };
};
