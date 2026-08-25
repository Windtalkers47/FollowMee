import crypto from 'crypto';
import AppDataSource from '../config/database';
import { PrivacyRequest } from '../entities/PrivacyRequest';
import { ConsentRecord } from '../entities/ConsentRecord';
import { ApplicationError } from '../errors/application.error';
import { emailService } from './email.service';
import auditService from './audit.service';
import { UAT_POLICY_VERSION } from './registration-request.service';
import { User } from '../entities/User';
import { NotificationHelper } from '../utils/notification.util';

const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
class PrivacyService {
  private repo = AppDataSource.getRepository(PrivacyRequest);
  async createRequest(input: { email: string; requestType: PrivacyRequest['requestType']; message?: string; website?: string }): Promise<{ requestId: string; status: string }> {
    if (input.website) return { requestId: crypto.randomUUID(), status: 'pending_email' };
    if (!['access','correction','deletion','withdrawal','other'].includes(input.requestType)) throw new ApplicationError('Invalid privacy request type', 'PRIVACY_REQUEST_TYPE_INVALID', 400);
    const token = crypto.randomBytes(32).toString('hex');
    const request = await this.repo.save({ email: input.email.trim().toLowerCase(), requestType: input.requestType, message: input.message?.trim().slice(0, 4000) || null, status: 'pending_email', verificationTokenHash: digest(token), verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), verifiedAt: null, assignedTo: null, resolvedAt: null });
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    if (!await emailService.sendEmail({ to: { email: request.email }, subject: 'Verify your FollowMee privacy request', html: `<p><a href="${baseUrl}/privacy/request/verify?token=${encodeURIComponent(token)}">Verify privacy request</a></p>`, text: `Verify privacy request: ${baseUrl}/privacy/request/verify?token=${token}` })) throw new ApplicationError('Verification email could not be delivered', 'PRIVACY_EMAIL_DELIVERY_FAILED', 503);
    return { requestId: request.requestId, status: request.status };
  }
  async verify(token: string): Promise<{ requestId: string; status: string }> {
    const request = await this.repo.findOne({ where: { verificationTokenHash: digest(token) }, select: ['requestId','requestType','status','verificationTokenHash','verificationExpiresAt','verifiedAt'] });
    if (!request || !request.verificationExpiresAt || request.verificationExpiresAt <= new Date()) throw new ApplicationError('Verification link is invalid or expired', 'PRIVACY_VERIFICATION_INVALID', 400);
    request.status = 'open'; request.verifiedAt = new Date(); request.verificationTokenHash = null; request.verificationExpiresAt = null;
    await this.repo.save(request);
    const owners = (await AppDataSource.getRepository(User).find({ where: { isActive: true }, relations: ['userRoles','userRoles.role'] })).filter(user => user.userRoles.some(item => item.role.roleName === 'Owner')).map(user => user.userId);
    await NotificationHelper.notifyPrivacyRequest(request.requestId, request.requestType, owners);
    return { requestId: request.requestId, status: request.status };
  }
  async list(status?: string) { return this.repo.find({ where: status ? { status: status as PrivacyRequest['status'] } : {}, order: { createdAt: 'DESC' }, take: 100 }); }
  async update(requestId: string, actorId: number, input: { status?: PrivacyRequest['status']; assignedTo?: number | null }) {
    const request = await this.repo.findOne({ where: { requestId } });
    if (!request) throw new ApplicationError('Privacy request not found', 'PRIVACY_REQUEST_NOT_FOUND', 404);
    if (input.status && !['open','in_progress','completed','rejected'].includes(input.status)) throw new ApplicationError('Invalid privacy status', 'PRIVACY_STATUS_INVALID', 400);
    if (input.status) request.status = input.status; if ('assignedTo' in input) request.assignedTo = input.assignedTo ?? null;
    request.resolvedAt = ['completed','rejected'].includes(request.status) ? new Date() : null;
    await this.repo.save(request); await auditService.logEvent({ userId: actorId, action: 'PRIVACY_REQUEST_UPDATED', status: 'SUCCESS', details: { requestId, status: request.status } });
    return request;
  }
  async recordConsent(input: { anonymousId?: string; policyVersion: string; preferences: boolean; analytics: boolean }, userId?: number) {
    if (input.policyVersion !== UAT_POLICY_VERSION) throw new ApplicationError('Policy version is outdated', 'POLICY_VERSION_OUTDATED', 409);
    return AppDataSource.getRepository(ConsentRecord).save({ userId: userId || null, subjectHash: input.anonymousId ? digest(input.anonymousId) : null, policyVersion: input.policyVersion, categories: { essential: true, preferences: Boolean(input.preferences), analytics: Boolean(input.analytics) }, source: 'cookie_preferences', withdrawnAt: null });
  }
}
export const privacyService = new PrivacyService();
