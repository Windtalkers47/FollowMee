import { DataSource } from 'typeorm';
import { NotificationMetric } from '../entities/NotificationMetric';
import { NotificationMetricRepository, CreateMetricDto, DashboardMetrics, AnalyticsQueryDto } from '../repositories/notification-metric.repository';
import { createHash } from 'crypto';

/**
 * Interface สำหรับ device detection
 */
interface DeviceInfo {
  deviceType: string;
  browserType: string;
  osType: string;
}

/**
 * NotificationMetricService
 * 
 * Business logic layer สำหรับ notification analytics
 * 
 * Design Considerations:
 * 1. Performance: ใช้ repository สำหรับ optimized queries
 * 2. Privacy: Hash IP address ก่อนเก็บ
 * 3. Deduplication: ป้องกัน duplicate tracking
 * 4. Cost-effective: ไม่เก็บข้อมูลที่ไม่จำเป็น
 */
export class NotificationMetricService {
  private metricRepository: NotificationMetricRepository;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.metricRepository = new NotificationMetricRepository();
  }

  /**
   * แยกแยะ device type จาก user agent
   */
  private detectDevice(userAgent?: string): DeviceInfo {
    if (!userAgent) {
      return { deviceType: 'unknown', browserType: 'unknown', osType: 'unknown' };
    }

    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let deviceType = 'desktop';
    if (/mobile|android|iphone|ipod/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      deviceType = 'tablet';
    }

    // Detect browser
    let browserType = 'other';
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browserType = 'chrome';
    } else if (ua.includes('firefox')) {
      browserType = 'firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browserType = 'safari';
    } else if (ua.includes('edg') || ua.includes('edge')) {
      browserType = 'edge';
    }

    // Detect OS
    let osType = 'other';
    if (ua.includes('windows')) {
      osType = 'windows';
    } else if (ua.includes('mac os') || ua.includes('macos')) {
      osType = 'macos';
    } else if (ua.includes('linux')) {
      osType = 'linux';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      osType = 'ios';
    } else if (ua.includes('android')) {
      osType = 'android';
    }

    return { deviceType, browserType, osType };
  }

  /**
   * Hash IP address สำหรับ privacy
   */
  private hashIp(ipAddress?: string): string | undefined {
    if (!ipAddress) return undefined;
    return createHash('sha256').update(ipAddress).digest('hex');
  }

  /**
   * Track open event
   * เมื่อผู้ใช้เปิด notification
   * 
   * @param recipientId ID ของ notification recipient
   * @param userId ID ของผู้ใช้
   * @param notificationId ID ของ notification
   * @param userAgent User agent string จาก request
   * @param ipAddress IP address จาก request
   * @param sessionId Session ID (optional)
   */
  async trackOpen(
    recipientId: number,
    userId: number,
    notificationId: number,
    userAgent?: string,
    ipAddress?: string,
    sessionId?: string
  ): Promise<NotificationMetric> {
    const deviceInfo = this.detectDevice(userAgent);
    const ipHash = this.hashIp(ipAddress);

    return await this.metricRepository.upsertMetric({
      recipientId,
      userId,
      notificationId,
      deviceType: deviceInfo.deviceType,
      browserType: deviceInfo.browserType,
      osType: deviceInfo.osType,
      sessionId,
      ipHash,
    });
  }

  /**
   * Track click event
   * เมื่อผู้ใช้คลิก actionUrl
   * 
   * @param recipientId ID ของ notification recipient
   * @param userId ID ของผู้ใช้
   * @returns Metric ที่อัพเดทแล้ว หรือ null ถ้าไม่พบ
   */
  async trackClick(
    recipientId: number,
    userId: number
  ): Promise<NotificationMetric | null> {
    return await this.metricRepository.trackClick(recipientId, userId);
  }

  /**
   * ดึง open rate ของ notification
   * @param notificationId ID ของ notification
   * @returns Open rate เป็น percentage (0-100)
   */
  async getOpenRate(notificationId: number): Promise<number> {
    return await this.metricRepository.getOpenRate(notificationId);
  }

  /**
   * ดึง click-through rate ของ notification
   * @param notificationId ID ของ notification
   * @returns CTR เป็น percentage (0-100)
   */
  async getClickThroughRate(notificationId: number): Promise<number> {
    return await this.metricRepository.getClickThroughRate(notificationId);
  }

  /**
   * ดึง dashboard metrics สำหรับ admin
   * @param query Query options (date range, filters)
   * @returns Dashboard metrics
   */
  async getDashboardMetrics(query?: AnalyticsQueryDto): Promise<DashboardMetrics> {
    return await this.metricRepository.getDashboardMetrics(query);
  }

  /**
   * ดึง engagement stats ของ user
   * @param userId ID ของผู้ใช้
   * @param days จำนวนวันย้อนหลัง (default: 30)
   * @returns User engagement stats
   */
  async getUserEngagementStats(
    userId: number,
    days: number = 30
  ): Promise<{
    totalNotifications: number;
    openedCount: number;
    clickedCount: number;
    openRate: number;
    clickRate: number;
    avgTimeToClick: number | null;
    mostActiveDevice: string;
  }> {
    return await this.metricRepository.getUserEngagementStats(userId, days);
  }

  /**
   * ดึง metrics ของ notification เฉพาะ
   * @param notificationId ID ของ notification
   * @returns Array of metrics
   */
  async getNotificationMetrics(notificationId: number): Promise<NotificationMetric[]> {
    return await this.metricRepository.findByNotificationId(notificationId);
  }

  /**
   * ดึง metrics ของ user ในช่วงเวลาที่กำหนด
   * @param userId ID ของผู้ใช้
   * @param startDate วันที่เริ่มต้น
   * @param endDate วันที่สิ้นสุด
   * @returns Array of metrics
   */
  async getUserMetrics(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<NotificationMetric[]> {
    return await this.metricRepository.findByUserAndDateRange(userId, startDate, endDate);
  }

  /**
   * Cleanup metrics เก่า
   * สำหรับ maintenance เพื่อลด database size
   * 
   * @param daysToKeep จำนวนวันที่ต้องการเก็บ (default: 90 วัน)
   * @returns จำนวนแถวที่ลบ
   */
  async cleanupOldMetrics(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    return await this.metricRepository.cleanupOldMetrics(cutoffDate);
  }

  /**
   * Get summary stats อย่างรวดเร็ว
   * สำหรับใช้ caching หรือ display เบื้องต้น
   */
  async getQuickSummary(): Promise<{
    totalMetrics: number;
    totalOpened: number;
    totalClicked: number;
    overallOpenRate: number;
    overallCtr: number;
  }> {
    const result = await this.metricRepository.getRepository().createQueryBuilder('metric')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN metric.openedAt IS NOT NULL THEN 1 END)', 'opened')
      .addSelect('COUNT(CASE WHEN metric.clickedAt IS NOT NULL THEN 1 END)', 'clicked')
      .getRawOne();

    const total = parseInt(result.total) || 0;
    const opened = parseInt(result.opened) || 0;
    const clicked = parseInt(result.clicked) || 0;

    return {
      totalMetrics: total,
      totalOpened: opened,
      totalClicked: clicked,
      overallOpenRate: total > 0 ? (opened / total) * 100 : 0,
      overallCtr: opened > 0 ? (clicked / opened) * 100 : 0,
    };
  }
}