import crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { In } from 'typeorm';
import AppDataSource from '../config/database';
import { RegistrationRequest } from '../entities/RegistrationRequest';
import { ConsentRecord } from '../entities/ConsentRecord';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { UserRole } from '../entities/UserRole';
import { ApplicationError } from '../errors/application.error';
import { emailService } from './email.service';
import auditService from './audit.service';
import { NotificationHelper } from '../utils/notification.util';
import { productFunnelService } from './product-funnel.service';

export const UAT_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || '2026-08';
export const validateRegistrationPolicy = (input: { termsAccepted?: boolean; privacyAccepted?: boolean; termsVersion?: string; privacyVersion?: string }): 'ok' | 'required' | 'outdated' => {
  if (!input.termsAccepted || !input.privacyAccepted) return 'required';
  if (input.termsVersion !== UAT_POLICY_VERSION || input.privacyVersion !== UAT_POLICY_VERSION) return 'outdated';
  return 'ok';
};
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const tokenHash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const subjectHash = (value: string) => crypto.createHmac('sha256', process.env.PROFILE_ANALYTICS_SALT || 'followmee-development-salt').update(value).digest('hex');

export class RegistrationRequestService {
  private repo = AppDataSource.getRepository(RegistrationRequest);

  async getPolicy(): Promise<{ mode: 'invite_only' | 'bootstrap' | 'approval' | 'recovery_required' }> {
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') return { mode: 'invite_only' };
    const [ownerRows, userRows] = await Promise.all([
      AppDataSource.query('SELECT userId FROM system_owner WHERE singletonId = 1 LIMIT 1'),
      AppDataSource.query('SELECT COUNT(*) AS total FROM users WHERE isActive = 1'),
    ]);
    if (ownerRows.length) return { mode: 'approval' };
    const activeUsers = Number(userRows[0]?.total || 0);
    if (activeUsers > 0 || !process.env.BOOTSTRAP_OWNER_EMAIL?.trim()) return { mode: 'recovery_required' };
    return { mode: 'bootstrap' };
  }

  async verifyTurnstile(token: string | undefined, remoteip?: string): Promise<void> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') throw new ApplicationError('Signup verification is unavailable', 'TURNSTILE_NOT_CONFIGURED', 503);
      return;
    }
    if (!token) throw new ApplicationError('Human verification is required', 'TURNSTILE_REQUIRED', 400);
    const body = new URLSearchParams({ secret, response: token, ...(remoteip ? { remoteip } : {}) });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: controller.signal });
      const result = await response.json() as { success?: boolean };
      if (!result.success) throw new ApplicationError('Human verification failed', 'TURNSTILE_FAILED', 400);
    } finally { clearTimeout(timer); }
  }

  async recordAcceptedPolicy(userId: number, input: {
    email: string; termsAccepted?: boolean; privacyAccepted?: boolean; termsVersion?: string; privacyVersion?: string;
    analyticsConsent?: boolean; preferencesConsent?: boolean;
  }, source: 'registration' | 'registration_invite' = 'registration'): Promise<void> {
    const policy = validateRegistrationPolicy(input);
    if (policy === 'required') throw new ApplicationError('Terms and privacy acceptance are required', 'POLICY_ACCEPTANCE_REQUIRED', 400);
    if (policy === 'outdated') throw new ApplicationError('Policy version is outdated', 'POLICY_VERSION_OUTDATED', 409);
    await AppDataSource.getRepository(ConsentRecord).save({
      userId, subjectHash: subjectHash(normalizeEmail(input.email)), policyVersion: UAT_POLICY_VERSION,
      categories: { essential: true, preferences: Boolean(input.preferencesConsent), analytics: Boolean(input.analyticsConsent) },
      source, withdrawnAt: null,
    });
  }

  async submit(input: {
    email: string; userName: string; userLastName: string; userPhone1?: string; userPassword: string;
    termsAccepted?: boolean; privacyAccepted?: boolean; termsVersion?: string; privacyVersion?: string;
    analyticsConsent?: boolean; preferencesConsent?: boolean; website?: string; turnstileToken?: string;
    funnelSessionId?: string;
  }, context: { ip?: string; userAgent?: string }): Promise<{ requestId: string; status: string; devVerificationUrl?: string }> {
    if (input.website) return { requestId: crypto.randomUUID(), status: 'pending_email' };
    const registrationPolicy = await this.getPolicy();
    if (registrationPolicy.mode === 'recovery_required') {
      throw new ApplicationError('Workspace ownership requires recovery', 'OWNER_RECOVERY_REQUIRED', 503);
    }
    const policy = validateRegistrationPolicy(input);
    if (policy === 'required') throw new ApplicationError('Terms and privacy acceptance are required', 'POLICY_ACCEPTANCE_REQUIRED', 400);
    if (policy === 'outdated') throw new ApplicationError('Policy version is outdated', 'POLICY_VERSION_OUTDATED', 409);
    await this.verifyTurnstile(input.turnstileToken, context.ip);
    const email = normalizeEmail(input.email);
    const user = await AppDataSource.getRepository(User).findOne({ where: { userEmail: email } });
    if (user) throw new ApplicationError('Email already in use', 'EMAIL_ALREADY_REGISTERED', 409);
    const existing = await this.repo.findOne({ where: { email } });
    if (existing?.status === 'pending_approval') return { requestId: existing.requestId, status: existing.status };
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const entity = existing || this.repo.create();
    Object.assign(entity, {
      email, userName: input.userName.trim(), userLastName: input.userLastName.trim(), userPhone1: input.userPhone1?.trim() || null,
      passwordHash: await bcrypt.hash(input.userPassword, 12), status: 'pending_email', verificationTokenHash: tokenHash(token),
      verificationExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), verifiedAt: null, reviewedBy: null, reviewedAt: null,
      reviewReason: null, termsVersion: input.termsVersion, privacyVersion: input.privacyVersion, consentAt: now,
      ipHash: context.ip ? subjectHash(context.ip) : null,
      funnelSessionHash: input.funnelSessionId ? productFunnelService.hashSession(input.funnelSessionId) : null,
    });
    const saved = await this.repo.save(entity);
    await AppDataSource.getRepository(ConsentRecord).save({
      userId: null, subjectHash: subjectHash(email), policyVersion: UAT_POLICY_VERSION,
      categories: { essential: true, preferences: Boolean(input.preferencesConsent), analytics: Boolean(input.analyticsConsent) },
      source: 'registration', withdrawnAt: null,
    });
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const verificationUrl = `${baseUrl}/verify-registration?token=${encodeURIComponent(token)}`;
    if (!await emailService.sendRegistrationVerificationEmail(email, verificationUrl)) throw new ApplicationError('Verification email could not be delivered', 'REGISTRATION_EMAIL_DELIVERY_FAILED', 503);
    await auditService.logEvent({ userId: null, action: 'REGISTRATION_REQUEST_CREATED', status: 'SUCCESS', ipAddress: context.ip, userAgent: context.userAgent, details: { requestId: saved.requestId } });
    return {
      requestId: saved.requestId,
      status: saved.status,
      ...(emailService.isLocalPreview() ? { devVerificationUrl: verificationUrl } : {}),
    };
  }

  async verify(token: string): Promise<{ requestId: string; status: string; bootstrapCompleted?: boolean; ownerSetupRequired?: boolean }> {
    const result = await AppDataSource.transaction(async manager => {
      // Serializing on the immutable Owner role row prevents two first-user
      // verification requests from both observing an empty singleton.
      await manager.query("SELECT roleId FROM roles WHERE roleName = 'Owner' FOR UPDATE");
      const repo = manager.getRepository(RegistrationRequest);
      const request = await repo.findOne({
        where: { verificationTokenHash: tokenHash(token) },
        select: ['requestId','email','userName','userLastName','userPhone1','passwordHash','status','verificationTokenHash','verificationExpiresAt','verifiedAt','termsVersion','privacyVersion','consentAt','funnelSessionHash'],
      });
      if (!request || !request.verificationExpiresAt || request.verificationExpiresAt <= new Date()) {
        throw new ApplicationError('Verification link is invalid or expired', 'REGISTRATION_VERIFICATION_INVALID', 400);
      }
      if (request.status !== 'pending_email') return { requestId: request.requestId, status: request.status };

      const ownerRows = await manager.query('SELECT userId FROM system_owner WHERE singletonId = 1 FOR UPDATE');
      const userRows = await manager.query('SELECT COUNT(*) AS total FROM users WHERE isActive = 1');
      const activeUsers = Number(userRows[0]?.total || 0);
      if (!ownerRows.length && activeUsers > 0) {
        throw new ApplicationError('Workspace ownership requires recovery', 'OWNER_RECOVERY_REQUIRED', 503);
      }

      const bootstrapEmail = normalizeEmail(process.env.BOOTSTRAP_OWNER_EMAIL || '');
      const shouldBootstrap = !ownerRows.length && activeUsers === 0 && Boolean(bootstrapEmail) && request.email === bootstrapEmail;
      request.verifiedAt = new Date();
      request.verificationTokenHash = null;
      request.verificationExpiresAt = null;

      if (shouldBootstrap) {
        const ownerRole = await manager.getRepository(Role).findOne({ where: { roleName: 'Owner', isActive: true } });
        if (!ownerRole) throw new ApplicationError('Owner role is unavailable', 'OWNER_ROLE_CONFIG_INVALID', 500);
        const user = manager.getRepository(User).create({
          userEmail: request.email,
          userName: request.userName,
          userLastName: request.userLastName,
          userPhone1: request.userPhone1,
          userPhone2: null,
          userPassword: request.passwordHash,
          isActive: true,
        });
        const savedUser = await manager.getRepository(User).save(user);
        await manager.getRepository(UserRole).save({ userId: savedUser.userId, roleId: ownerRole.roleId });
        await manager.query('INSERT INTO system_owner (singletonId, userId) VALUES (1, ?)', [savedUser.userId]);
        await manager.getRepository(ConsentRecord).save({
          userId: savedUser.userId,
          subjectHash: subjectHash(request.email),
          policyVersion: request.privacyVersion,
          categories: { essential: true },
          source: 'registration',
          withdrawnAt: null,
        });
        request.status = 'approved';
        request.reviewedBy = savedUser.userId;
        request.reviewedAt = new Date();
        await repo.save(request);
        return { requestId: request.requestId, status: request.status, bootstrapCompleted: true, userId: savedUser.userId, email: request.email, funnelSessionHash: request.funnelSessionHash };
      }

      request.status = 'pending_approval';
      await repo.save(request);
      return { requestId: request.requestId, status: request.status, ownerSetupRequired: !ownerRows.length, funnelSessionHash: request.funnelSessionHash };
    });

    if (result.bootstrapCompleted) {
      await auditService.logEvent({ userId: result.userId, action: 'BOOTSTRAP_OWNER_CREATED', status: 'SUCCESS', details: { requestId: result.requestId } });
      await emailService.sendRegistrationDecisionEmail(result.email!, true);
      if (result.funnelSessionHash) await productFunnelService.recordHashed('registration_approved', result.funnelSessionHash, result.userId);
    } else {
      const users = await AppDataSource.getRepository(User).find({ where: { isActive: true }, relations: ['userRoles','userRoles.role'] });
      const owners = users.filter(user => user.userRoles.some(item => item.role.roleName === 'Owner')).map(user => user.userId);
      await NotificationHelper.notifyRegistrationApproval(result.requestId, owners);
      if (result.funnelSessionHash) await productFunnelService.recordHashed('registration_verified', result.funnelSessionHash);
    }
    return {
      requestId: result.requestId,
      status: result.status,
      ...(result.bootstrapCompleted ? { bootstrapCompleted: true } : {}),
      ...(result.ownerSetupRequired ? { ownerSetupRequired: true } : {}),
    };
  }

  async resend(emailValue: string): Promise<void> {
    const email = normalizeEmail(emailValue);
    const request = await this.repo.findOne({ where: { email }, select: ['requestId','email','status','verificationTokenHash','verificationExpiresAt'] });
    if (!request || request.status !== 'pending_email') return;
    const token = crypto.randomBytes(32).toString('hex');
    request.verificationTokenHash = tokenHash(token); request.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.repo.save(request);
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    if (!await emailService.sendRegistrationVerificationEmail(email, `${baseUrl}/verify-registration?token=${encodeURIComponent(token)}`)) throw new ApplicationError('Verification email could not be delivered', 'REGISTRATION_EMAIL_DELIVERY_FAILED', 503);
  }

  async list(status?: string): Promise<RegistrationRequest[]> {
    return this.repo.find({ where: status ? { status: status as RegistrationRequest['status'] } : {}, order: { createdAt: 'DESC' }, take: 100 });
  }

  async approve(requestId: string, reviewerId: number): Promise<{ userId: number }> {
    const result = await AppDataSource.transaction(async manager => {
      const repo = manager.getRepository(RegistrationRequest);
      const request = await repo.findOne({ where: { requestId }, select: ['requestId','email','userName','userLastName','userPhone1','passwordHash','status','termsVersion','privacyVersion','consentAt','funnelSessionHash'] });
      if (!request) throw new ApplicationError('Registration request not found', 'REGISTRATION_REQUEST_NOT_FOUND', 404);
      if (request.status === 'approved') {
        const existing = await manager.getRepository(User).findOne({ where: { userEmail: request.email } });
        if (existing) return { userId: existing.userId, email: request.email };
      }
      if (request.status !== 'pending_approval') throw new ApplicationError('Registration request is not ready for approval', 'REGISTRATION_NOT_VERIFIED', 409);
      if (await manager.getRepository(User).findOne({ where: { userEmail: request.email } })) throw new ApplicationError('Email already in use', 'EMAIL_ALREADY_REGISTERED', 409);
      const user = manager.getRepository(User).create({ userEmail: request.email, userName: request.userName, userLastName: request.userLastName, userPhone1: request.userPhone1, userPhone2: null, userPassword: request.passwordHash, isActive: true });
      const savedUser = await manager.getRepository(User).save(user);
      const role = await manager.getRepository(Role).findOne({ where: { roleName: In(['Member','Customer']), isActive: true } });
      if (!role) throw new ApplicationError('Member role is unavailable', 'MEMBER_ROLE_MISSING', 500);
      await manager.getRepository(UserRole).save({ userId: savedUser.userId, roleId: role.roleId });
      request.status = 'approved'; request.reviewedBy = reviewerId; request.reviewedAt = new Date(); request.reviewReason = null;
      await repo.save(request);
      return { userId: savedUser.userId, email: request.email, funnelSessionHash: request.funnelSessionHash };
    });
    await auditService.logEvent({ userId: reviewerId, action: 'REGISTRATION_REQUEST_APPROVED', status: 'SUCCESS', details: { requestId, createdUserId: result.userId } });
    await emailService.sendRegistrationDecisionEmail(result.email, true);
    if (result.funnelSessionHash) await productFunnelService.recordHashed('registration_approved', result.funnelSessionHash, result.userId);
    return { userId: result.userId };
  }

  async reject(requestId: string, reviewerId: number, reason?: string): Promise<void> {
    const request = await this.repo.findOne({ where: { requestId } });
    if (!request) throw new ApplicationError('Registration request not found', 'REGISTRATION_REQUEST_NOT_FOUND', 404);
    if (request.status === 'approved') throw new ApplicationError('Approved request cannot be rejected', 'REGISTRATION_ALREADY_APPROVED', 409);
    request.status = 'rejected'; request.reviewedBy = reviewerId; request.reviewedAt = new Date(); request.reviewReason = reason?.trim().slice(0, 500) || null;
    await this.repo.save(request);
    await auditService.logEvent({ userId: reviewerId, action: 'REGISTRATION_REQUEST_REJECTED', status: 'SUCCESS', details: { requestId } });
    await emailService.sendRegistrationDecisionEmail(request.email, false);
  }
}

export const registrationRequestService = new RegistrationRequestService();
