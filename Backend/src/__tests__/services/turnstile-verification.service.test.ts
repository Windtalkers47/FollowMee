import { RegistrationRequestService } from '../../services/registration-request.service';

describe('Turnstile verification', () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = 'server-secret';
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://follow-mee.vercel.app';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = originalSecret;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
    jest.restoreAllMocks();
  });

  it('accepts a successful token from the configured frontend hostname', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ success: true, hostname: 'follow-mee.vercel.app', 'error-codes': [] }),
    } as Response);

    await expect(new RegistrationRequestService().verifyTurnstile('one-time-token', '203.0.113.10')).resolves.toBeUndefined();

    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get('response')).toBe('one-time-token');
    expect(body.get('remoteip')).toBe('203.0.113.10');
  });

  it('logs only safe diagnostics when Cloudflare rejects an expired or reused token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    } as Response);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(new RegistrationRequestService().verifyTurnstile('must-not-be-logged')).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });

    expect(warn).toHaveBeenCalledWith('[Turnstile] Verification rejected', {
      errorCodes: ['timeout-or-duplicate'],
      hostname: null,
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('must-not-be-logged');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('server-secret');
  });

  it('rejects a valid token issued for another hostname', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ success: true, hostname: 'untrusted.example', 'error-codes': [] }),
    } as Response);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(new RegistrationRequestService().verifyTurnstile('other-host-token')).rejects.toMatchObject({ code: 'TURNSTILE_FAILED' });
  });
});
