import crypto from 'crypto';
import AppDataSource from '../config/database';
import { ApplicationError } from '../errors/application.error';
import { emailService } from './email.service';
import { outboxService } from './outbox.service';

interface InvitationRecord {
  invitationId: number;
  email: string;
  roleId: number | null;
  invitedBy: number;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  tokenHash: string;
  roleName?: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class InvitationService {
  constructor() {
    outboxService.register('invitation.email', async payload => {
      const invitationId = Number(payload.invitationId || 0);
      const invitation = await this.findById(invitationId);
      if (!invitation || invitation.status !== 'pending') return;
      const token = this.createToken(invitation);
      const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const inviteUrl = `${baseUrl}/register?invite=${encodeURIComponent(token)}`;
      const sent = await emailService.sendEmail({
        to: { email: invitation.email },
        subject: 'You are invited to FollowMee',
        html: `<p>You have been invited to join FollowMee.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This link expires in 7 days.</p>`,
        text: `You have been invited to join FollowMee. Accept: ${inviteUrl}`,
      });
      if (!sent) throw new Error('Invitation email delivery failed');
    });
  }

  private secret(): string {
    return process.env.INVITATION_SECRET || process.env.JWT_SECRET || 'followmee-invitation-development-secret';
  }

  private createToken(invitation: Pick<InvitationRecord, 'invitationId' | 'email' | 'expiresAt'>): string {
    const body = Buffer.from(JSON.stringify({
      id: Number(invitation.invitationId),
      email: normalizeEmail(invitation.email),
      exp: new Date(invitation.expiresAt).getTime(),
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.secret()).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async findById(invitationId: number): Promise<InvitationRecord | null> {
    const rows = await AppDataSource.query(`
      SELECT oi.*,r.roleName FROM organization_invitations oi
      LEFT JOIN roles r ON r.roleId=oi.roleId WHERE oi.invitationId=? LIMIT 1
    `, [invitationId]);
    return rows[0] || null;
  }

  async create(email: string, roleId: number | null, invitedBy: number) {
    const normalized = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ApplicationError('A valid email is required', 'INVITATION_EMAIL_INVALID', 400);
    }
    const users = await AppDataSource.query('SELECT userId,isActive FROM users WHERE LOWER(userEmail)=? LIMIT 1', [normalized]);
    if (users[0]?.isActive) throw new ApplicationError('This user already belongs to the organization', 'INVITATION_USER_EXISTS', 409);
    if (roleId) {
      const roles = await AppDataSource.query('SELECT roleId FROM roles WHERE roleId=? AND isActive=1 LIMIT 1', [roleId]);
      if (!roles[0]) throw new ApplicationError('The selected role is unavailable', 'INVITATION_ROLE_INVALID', 400);
    }
    await AppDataSource.query(`UPDATE organization_invitations SET status='expired' WHERE status='pending' AND expiresAt<=NOW()`);
    const pending = await AppDataSource.query(`SELECT invitationId FROM organization_invitations WHERE email=? AND status='pending' AND expiresAt>NOW() LIMIT 1`, [normalized]);
    if (pending[0]) throw new ApplicationError('A pending invitation already exists', 'INVITATION_ALREADY_PENDING', 409);
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    const placeholder = crypto.randomBytes(32).toString('hex');
    const result = await AppDataSource.query(`
      INSERT INTO organization_invitations(email,tokenHash,roleId,invitedBy,expiresAt)
      VALUES (?,?,?,?,?)
    `, [normalized, placeholder, roleId, invitedBy, expiresAt]);
    const invitation = await this.findById(Number(result.insertId));
    if (!invitation) throw new Error('Invitation could not be created');
    const token = this.createToken(invitation);
    await AppDataSource.query('UPDATE organization_invitations SET tokenHash=? WHERE invitationId=?', [this.hashToken(token), invitation.invitationId]);
    await outboxService.enqueue({
      eventType: 'invitation.email', aggregateType: 'invitation', aggregateId: invitation.invitationId,
      payload: { invitationId: invitation.invitationId }, idempotencyKey: `invitation:${invitation.invitationId}:initial`,
    });
    return { ...invitation, token, tokenHash: undefined };
  }

  async validate(token: string): Promise<InvitationRecord> {
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature) throw new ApplicationError('Invitation is invalid', 'INVITATION_INVALID', 400);
    const expected = crypto.createHmac('sha256', this.secret()).update(body).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new ApplicationError('Invitation is invalid', 'INVITATION_INVALID', 400);
    }
    let data: { id: number; email: string; exp: number };
    try { data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); }
    catch { throw new ApplicationError('Invitation is invalid', 'INVITATION_INVALID', 400); }
    const invitation = await this.findById(Number(data.id));
    if (!invitation || invitation.tokenHash !== this.hashToken(token) || normalizeEmail(invitation.email) !== normalizeEmail(data.email)) {
      throw new ApplicationError('Invitation is invalid', 'INVITATION_INVALID', 400);
    }
    if (invitation.status !== 'pending') throw new ApplicationError(`Invitation is ${invitation.status}`, `INVITATION_${invitation.status.toUpperCase()}`, 409);
    if (new Date(invitation.expiresAt).getTime() <= Date.now() || data.exp <= Date.now()) {
      await AppDataSource.query(`UPDATE organization_invitations SET status='expired' WHERE invitationId=?`, [invitation.invitationId]);
      throw new ApplicationError('Invitation has expired', 'INVITATION_EXPIRED', 410);
    }
    return invitation;
  }

  async accept(invitationId: number): Promise<void> {
    await AppDataSource.query(`UPDATE organization_invitations SET status='accepted',acceptedAt=NOW() WHERE invitationId=? AND status='pending'`, [invitationId]);
  }

  async list() {
    await AppDataSource.query(`UPDATE organization_invitations SET status='expired' WHERE status='pending' AND expiresAt<=NOW()`);
    return AppDataSource.query(`
      SELECT oi.invitationId,oi.email,oi.roleId,r.roleName,oi.invitedBy,oi.status,oi.expiresAt,oi.acceptedAt,oi.revokedAt,oi.createdAt
      FROM organization_invitations oi LEFT JOIN roles r ON r.roleId=oi.roleId ORDER BY oi.createdAt DESC LIMIT 200
    `);
  }

  async resend(invitationId: number, actorUserId: number) {
    const invitation = await this.findById(invitationId);
    if (!invitation || !['pending', 'expired'].includes(invitation.status)) throw new ApplicationError('Invitation cannot be resent', 'INVITATION_STATE_INVALID', 409);
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    const refreshed = { ...invitation, expiresAt, invitedBy: actorUserId };
    const token = this.createToken(refreshed);
    await AppDataSource.query(`UPDATE organization_invitations SET tokenHash=?,invitedBy=?,status='pending',expiresAt=?,acceptedAt=NULL,revokedAt=NULL WHERE invitationId=?`, [this.hashToken(token), actorUserId, expiresAt, invitationId]);
    await outboxService.enqueue({ eventType: 'invitation.email', aggregateType: 'invitation', aggregateId: invitationId, payload: { invitationId }, idempotencyKey: `invitation:${invitationId}:resend:${expiresAt.toISOString()}` });
    return { invitationId, email: invitation.email, expiresAt, token };
  }

  async revoke(invitationId: number): Promise<void> {
    const result = await AppDataSource.query(`UPDATE organization_invitations SET status='revoked',revokedAt=NOW() WHERE invitationId=? AND status='pending'`, [invitationId]);
    if (!Number(result.affectedRows || 0)) throw new ApplicationError('Only pending invitations can be revoked', 'INVITATION_STATE_INVALID', 409);
  }
}

export const invitationService = new InvitationService();
