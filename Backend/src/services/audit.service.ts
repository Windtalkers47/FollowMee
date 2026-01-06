import AppDataSource from '../config/database';
import { AuditLog } from '../entities/AuditLog';

// Interface for audit log data
export interface IAuditLogData {
  action: string;
  status: 'SUCCESS' | 'FAILURE';
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | null;
}

export class AuditService {
  private auditLogRepository = AppDataSource.getRepository(AuditLog);

  /**
   * Log an audit event
   */
  async logEvent({
    userId,
    action,
    status,
    ipAddress,
    userAgent,
    details,
  }: {
    userId: number | null;
    action: string;
    status: 'SUCCESS' | 'FAILURE';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }) {
    try {
      const auditLog = this.auditLogRepository.create({
        userId,
        action,
        status,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        details: details ? JSON.stringify(details) : null,
      });

      await this.auditLogRepository.save(auditLog);
      return auditLog;
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw to avoid breaking the main flow
      return null;
    }
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(userId: number, limit = 50) {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get all logs (admin only)
   */
  async getAllLogs(limit = 100) {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

export default new AuditService();
