import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authApi, { REGISTRATION_REQUEST_TIMEOUT_MS } from '../../api/auth.api';

describe('authApi.register', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts a registration request that exceeds the UAT timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));

    const request = expect(authApi.register({
      email: 'uat@example.test',
      userName: 'UAT',
      userLastName: 'Tester',
      userPassword: 'FollowMee-UAT-2026!',
    })).rejects.toMatchObject({ code: 'REGISTRATION_REQUEST_TIMEOUT', status: 408 });
    await vi.advanceTimersByTimeAsync(REGISTRATION_REQUEST_TIMEOUT_MS);

    await request;
  });
});
