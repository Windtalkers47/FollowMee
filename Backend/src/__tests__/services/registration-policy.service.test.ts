import AppDataSource from '../../config/database';
import { RegistrationRequestService } from '../../services/registration-request.service';

describe('registration policy', () => {
  const originalFlag = process.env.ALLOW_PUBLIC_REGISTRATION;
  const originalBootstrapEmail = process.env.BOOTSTRAP_OWNER_EMAIL;

  afterEach(() => {
    process.env.ALLOW_PUBLIC_REGISTRATION = originalFlag;
    process.env.BOOTSTRAP_OWNER_EMAIL = originalBootstrapEmail;
    jest.restoreAllMocks();
  });

  it('keeps registration invite-only when the server flag is disabled', async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = 'false';
    await expect(new RegistrationRequestService().getPolicy()).resolves.toEqual({ mode: 'invite_only' });
  });

  it('offers bootstrap only for an empty workspace with a configured Owner email', async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
    process.env.BOOTSTRAP_OWNER_EMAIL = 'owner@example.test';
    (AppDataSource as any).query = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);
    await expect(new RegistrationRequestService().getPolicy()).resolves.toEqual({ mode: 'bootstrap' });
  });

  it('fails closed when users exist without the Owner singleton', async () => {
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
    process.env.BOOTSTRAP_OWNER_EMAIL = 'owner@example.test';
    (AppDataSource as any).query = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 1 }]);
    await expect(new RegistrationRequestService().getPolicy()).resolves.toEqual({ mode: 'recovery_required' });
  });
});
