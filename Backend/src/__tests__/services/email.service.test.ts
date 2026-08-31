import { EmailService } from '../../services/email.service';

describe('EmailService SendGrid delivery', () => {
  const originalApiKey = process.env.SENDGRID_API_KEY;
  const originalFrom = process.env.SENDGRID_FROM_EMAIL;
  const originalFetch = global.fetch;
  const originalMode = process.env.EMAIL_DELIVERY_MODE;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDbName = process.env.DB_NAME;

  beforeEach(() => {
    process.env.SENDGRID_API_KEY = 'SG.test-key';
    process.env.SENDGRID_FROM_EMAIL = 'verified-sender@example.test';
  });

  afterEach(() => {
    process.env.SENDGRID_API_KEY = originalApiKey;
    process.env.SENDGRID_FROM_EMAIL = originalFrom;
    process.env.EMAIL_DELIVERY_MODE = originalMode;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.DB_NAME = originalDbName;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the SendGrid HTTPS API and does not expose the recipient in logs', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 202 })) as jest.Mock;
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const service = new EmailService();

    await expect(service.sendRegistrationVerificationEmail('recipient@example.test', 'https://followmee.test/verify')).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', expect.objectContaining({ method: 'POST' }));
    expect(log.mock.calls.flat().join(' ')).not.toContain('recipient@example.test');
  });

  it('returns false when SendGrid rejects the request', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      errors: [{ message: 'The from address does not match a verified Sender Identity: private@example.test', field: 'from' }],
    }), { status: 403, headers: { 'Content-Type': 'application/json' } })) as jest.Mock;
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = new EmailService();

    await expect(service.sendRegistrationVerificationEmail('recipient@example.test', 'https://followmee.test/verify')).resolves.toBe(false);
    expect(errorLog).toHaveBeenCalledWith('[EmailService] SendGrid API rejected email', { status: 403, reason: 'sender_identity' });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private@example.test');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('recipient@example.test');
  });

  it('allows token-free local preview only on the disposable development database', async () => {
    delete process.env.SENDGRID_API_KEY;
    process.env.EMAIL_DELIVERY_MODE = 'preview';
    process.env.NODE_ENV = 'development';
    process.env.DB_NAME = 'followmee_e2e';
    const service = new EmailService();

    expect(service.isLocalPreview()).toBe(true);
    await expect(service.sendRegistrationVerificationEmail('local@example.test', 'http://localhost/verify?token=secret')).resolves.toBe(true);
  });

  it('refuses preview mode outside the disposable development database', () => {
    delete process.env.SENDGRID_API_KEY;
    process.env.EMAIL_DELIVERY_MODE = 'preview';
    process.env.NODE_ENV = 'production';
    process.env.DB_NAME = 'followmee_uat';

    expect(() => new EmailService()).toThrow(/restricted to development/);
  });
});
