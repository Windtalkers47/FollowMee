import crypto from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import dataSource from '../../config/database';
import { RegistrationRequest } from '../../entities/RegistrationRequest';
import { User } from '../../entities/User';
import { registrationRequestService, UAT_POLICY_VERSION } from '../../services/registration-request.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationHelper } from '../../utils/notification.util';
import { emailService } from '../../services/email.service';

const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

describe('first Owner registration bootstrap', () => {
  const ownerEmail = 'bootstrap-owner@example.test';
  const originalBootstrapEmail = process.env.BOOTSTRAP_OWNER_EMAIL;

  beforeAll(async () => {
    process.env.BOOTSTRAP_OWNER_EMAIL = ownerEmail;
    process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
    await dataSource.initialize();
    NotificationHelper.initialize(new NotificationService(dataSource));
    jest.spyOn(emailService, 'sendRegistrationDecisionEmail').mockResolvedValue(true);
  });

  afterAll(async () => {
    process.env.BOOTSTRAP_OWNER_EMAIL = originalBootstrapEmail;
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  const createRequest = async (email: string, token: string) => dataSource.getRepository(RegistrationRequest).save({
    email,
    userName: 'First',
    userLastName: 'Owner',
    userPhone1: null,
    passwordHash: await bcrypt.hash('FollowMee-Bootstrap-2026!', 10),
    status: 'pending_email',
    verificationTokenHash: digest(token),
    verificationExpiresAt: new Date(Date.now() + 60_000),
    verifiedAt: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
    termsVersion: UAT_POLICY_VERSION,
    privacyVersion: UAT_POLICY_VERSION,
    consentAt: new Date(),
    ipHash: null,
    funnelSessionHash: null,
  });

  it('holds other requests, creates the configured first Owner once, then switches to approval mode', async () => {
    await createRequest('waiting@example.test', 'waiting-token');
    await expect(registrationRequestService.verify('waiting-token')).resolves.toMatchObject({ status: 'pending_approval', ownerSetupRequired: true });
    expect(await dataSource.getRepository(User).count()).toBe(0);

    await createRequest(ownerEmail, 'owner-token');
    await expect(registrationRequestService.verify('owner-token')).resolves.toMatchObject({ status: 'approved', bootstrapCompleted: true });
    const owner = await dataSource.getRepository(User).findOneOrFail({ where: { userEmail: ownerEmail }, relations: ['userRoles', 'userRoles.role'] });
    expect(owner.userRoles.map(item => item.role.roleName)).toEqual(['Owner']);
    const singleton = await dataSource.query('SELECT userId FROM system_owner WHERE singletonId = 1');
    expect(Number(singleton[0].userId)).toBe(owner.userId);
    await expect(registrationRequestService.getPolicy()).resolves.toEqual({ mode: 'approval' });
    await expect(registrationRequestService.verify('owner-token')).rejects.toMatchObject({ code: 'REGISTRATION_VERIFICATION_INVALID' });
  });
});
