import { describe, expect, it } from 'vitest';
import { messages, type MessageKey } from '../../i18n/messages';
import { userFacingMutationError } from '../../utils/userFacingError';
import { toUserManagementError, UserManagementRequestError } from '../../utils/userManagementError';

const t = (key: MessageKey) => key;
const apiError = (status: number, code?: string) => ({
  isAxiosError: true,
  response: { status, data: { code } },
});

describe('language and error consistency', () => {
  it('keeps the English and Thai catalogs in lockstep', () => {
    expect(Object.keys(messages.th).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it.each([
    [403, undefined, 'feedback.permissionTitle'],
    [409, undefined, 'feedback.conflictTitle'],
    [422, undefined, 'feedback.validationTitle'],
    [500, undefined, 'feedback.failed'],
  ])('maps HTTP %s without exposing backend text', (status, code, title) => {
    const result = userFacingMutationError(apiError(status, code), t);
    expect(result.title).toBe(title);
    expect(result.message).not.toContain('backend');
  });

  it('maps missing responses to an actionable network message', () => {
    expect(userFacingMutationError(new Error('private backend text'), t)).toEqual({
      title: 'feedback.networkTitle',
      message: 'feedback.networkHelp',
    });
  });

  it('classifies user-management failures without retaining backend text', () => {
    expect(toUserManagementError(new UserManagementRequestError(403))).toEqual({ kind: 'permission' });
    expect(toUserManagementError(new UserManagementRequestError(409))).toEqual({ kind: 'conflict' });
    expect(toUserManagementError(new TypeError('private network detail'))).toEqual({ kind: 'network' });
  });
});
