import * as bcrypt from 'bcryptjs';
import dataSource from '../../config/database';
import { RegistrationRequest } from '../../entities/RegistrationRequest';
import { User } from '../../entities/User';
import { UserRole } from '../../entities/UserRole';
import { registrationRequestService, UAT_POLICY_VERSION } from '../../services/registration-request.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationHelper } from '../../utils/notification.util';
import { webSocketService } from '../../services/websocket.service';
import { emailService } from '../../services/email.service';

describe('closed-UAT registration approval', () => {
  const email = 'uat-pending@example.test'; let ownerId: number;
  beforeAll(async () => {
    await dataSource.initialize();
    ownerId = (await dataSource.getRepository(User).findOneByOrFail({ userEmail: 'qa-creator@example.test' })).userId;
    const notifications = new NotificationService(dataSource); NotificationHelper.initialize(notifications);
    jest.spyOn(webSocketService, 'emitNotificationToUser').mockImplementation(() => undefined);
    jest.spyOn(webSocketService, 'emitUnreadCount').mockImplementation(() => undefined);
    jest.spyOn(emailService, 'sendRegistrationDecisionEmail').mockResolvedValue(true);
  });
  beforeEach(async () => { const user = await dataSource.getRepository(User).findOne({ where: { userEmail: email } }); if (user) { await dataSource.getRepository(UserRole).delete({ userId: user.userId }); await dataSource.getRepository(User).delete({ userId: user.userId }); } await dataSource.getRepository(RegistrationRequest).delete({ email }); });
  afterAll(async () => { if (dataSource.isInitialized) await dataSource.destroy(); });
  it('creates a Member only after a verified request is approved and remains idempotent', async () => {
    const request = await dataSource.getRepository(RegistrationRequest).save({ email, userName: 'UAT', userLastName: 'Tester', userPhone1: null, passwordHash: await bcrypt.hash('FollowMee-UAT-2026!', 10), status: 'pending_approval', verificationTokenHash: null, verificationExpiresAt: null, verifiedAt: new Date(), reviewedBy: null, reviewedAt: null, reviewReason: null, termsVersion: UAT_POLICY_VERSION, privacyVersion: UAT_POLICY_VERSION, consentAt: new Date(), ipHash: null, funnelSessionHash: null });
    expect(await dataSource.getRepository(User).findOne({ where: { userEmail: email } })).toBeNull();
    const first = await registrationRequestService.approve(request.requestId, ownerId); const second = await registrationRequestService.approve(request.requestId, ownerId);
    expect(second.userId).toBe(first.userId);
    const created = await dataSource.getRepository(User).findOneOrFail({ where: { userId: first.userId }, relations: ['userRoles','userRoles.role'] });
    expect(created.userRoles.map(item => item.role.roleName)).toEqual(['Member']);
  });
});
