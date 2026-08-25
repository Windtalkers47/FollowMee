process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.E2E_DB_NAME || 'followmee_e2e';
process.env.JWT_SECRET = 'followmee-e2e-jwt-secret';

if (!process.env.DB_NAME.endsWith('_e2e')) {
  throw new Error(`Integration tests refuse database "${process.env.DB_NAME}". Use a database ending in "_e2e".`);
}

jest.mock('../../services/email.service', () => ({
  emailService: {
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendRegistrationVerificationEmail: jest.fn().mockResolvedValue(true),
    sendRegistrationDecisionEmail: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
    getEmailUsage: jest.fn().mockReturnValue({ sent: 0, limit: 100, remaining: 100 }),
  },
}));

jest.mock('../../services/push-notification.service', () => ({
  pushNotificationService: { sendNotificationToUsers: jest.fn().mockResolvedValue(undefined) },
}));
