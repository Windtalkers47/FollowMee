import { Between, LessThan, MoreThan, In } from 'typeorm';
import { NotificationMetric } from '../entities/NotificationMetric';
import { Brackets } from 'typeorm';
import { BaseRepository } from './base.repository';

/**
 * Interface สำหรับ create metric
 */
export interface CreateMetricDto {
  recipientId: number;  // int - FK to notification_recipients
  userId: number;       // int - FK to users
  notificationId: number; // bigint - FK to notifications
  deviceType?: string;
  browserType?: string;
  osType?: string;
  sessionId?: string;
  ipHash?: string;
}

/**
 * Interface สำหรับ analytics query
 */
export interface AnalyticsQueryDto {
  startDate?: Date;
  endDate?: Date;
  notificationId?: number;
  userId?: number;
  deviceType?: string;
}

/**
 * Interface สำหรับ dashboard metrics
 */
export interface DashboardMetrics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickThroughRate: number;
  avgTimeToClick: number | null;
  byDeviceType: DeviceTypeStats[];
  byNotificationType: NotificationTypeStats[];
  topNotifications: TopNotification[];
  trendData: TrendDataPoint[];
}

export interface DeviceTypeStats {
  deviceType: string;
  count: number;
  openRate: number;
  clickRate: number;
}

export interface NotificationTypeStats {
  notificationType: string;
  count: number;
  openRate: number;
  clickRate: number;
}

export interface TopNotification {
  notificationId: number;
  title: string;
  notificationType: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
}

export interface TrendDataPoint {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
}

/**
 * NotificationMetricRepository
 *
 * Design Principles:
 * 1. Efficient queries - ใช้ aggregate queries แทน multiple queries
 * 2. Caching-friendly - ผลลัพธ์เหมาะสำหรับ caching
 * 3. Scalable - ใช้ indexes ที่มีประสิทธิภาพ
 */
export class NotificationMetricRepository extends BaseRepository<NotificationMetric> {
  constructor() {
    super(NotificationMetric);
  }
  
  /**
   * สร้างหรืออัพเดท metric (upsert)
   * ป้องกัน duplicate tracking
   */
  async upsertMetric(dto: CreateMetricDto): Promise<NotificationMetric> {
    const existing = await this.findOne({
      recipientId: dto.recipientId,
      userId: dto.userId,
    } as any);

    if (existing) {
      // อัพเดทเฉพาะ openedAt ถ้ายังไม่มี
      if (!existing.openedAt) {
        existing.openedAt = new Date();
        existing.deviceType = dto.deviceType || 'unknown';
        existing.browserType = dto.browserType || 'unknown';
        existing.osType = dto.osType || 'unknown';
        existing.sessionId = dto.sessionId;
        existing.ipHash = dto.ipHash;
        await this.save(existing);
      }
      return existing;
    }

    // สร้างใหม่
    const metric = this.create({
      ...dto,
      openedAt: new Date(),
      deviceType: dto.deviceType || 'unknown',
      browserType: dto.browserType || 'unknown',
      osType: dto.osType || 'unknown',
    });

    return await this.save(metric);
  }

  /**
   * Track click event
   */
  async trackClick(recipientId: number, userId: number): Promise<NotificationMetric | null> {
    const metric = await this.findOne({
      where: { recipientId, userId },
    });

    if (!metric) {
      return null;
    }

    if (!metric.clickedAt) {
      metric.clickedAt = new Date();
      await this.save(metric);
    }

    return metric;
  }

  /**
   * หา metric โดย recipientId และ userId
   */
  async findByRecipientAndUser(
    recipientId: number,
    userId: number
  ): Promise<NotificationMetric | null> {
    return await this.repository.findOne({
      where: { recipientId, userId },
      relations: ['notification', 'user'],
    });
  }

  /**
   * หา metrics โดย notificationId
   */
  async findByNotificationId(notificationId: number): Promise<NotificationMetric[]> {
    return await this.repository.find({
      where: { notificationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * หา metrics โดย userId และ date range
   */
  async findByUserAndDateRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<NotificationMetric[]> {
    return await this.repository.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['notification'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * คำนวณ open rate ของ notification
   * @returns percentage (0-100)
   */
  async getOpenRate(notificationId: number): Promise<number> {
    const result = await this.repository.createQueryBuilder('metric')
      .select('COUNT(DISTINCT metric.recipientId)', 'total')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.openedAt IS NOT NULL THEN metric.recipientId END)', 'opened')
      .where('metric.notificationId = :notificationId', { notificationId })
      .getRawOne();

    const total = parseInt(result.total) || 0;
    const opened = parseInt(result.opened) || 0;

    if (total === 0) return 0;
    return (opened / total) * 100;
  }

  /**
   * คำนวณ click-through rate ของ notification
   * CTR = (clicked / opened) * 100
   * @returns percentage (0-100)
   */
  async getClickThroughRate(notificationId: number): Promise<number> {
    const result = await this.repository.createQueryBuilder('metric')
      .select('COUNT(DISTINCT CASE WHEN metric.openedAt IS NOT NULL THEN metric.recipientId END)', 'opened')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.clickedAt IS NOT NULL THEN metric.recipientId END)', 'clicked')
      .where('metric.notificationId = :notificationId', { notificationId })
      .getRawOne();

    const opened = parseInt(result.opened) || 0;
    const clicked = parseInt(result.clicked) || 0;

    if (opened === 0) return 0;
    return (clicked / opened) * 100;
  }

  /**
   * ดึง dashboard metrics สำหรับ admin
   * Optimized: ใช้ single query สำหรับ aggregate data
   */
  async getDashboardMetrics(query?: AnalyticsQueryDto): Promise<DashboardMetrics> {
    const startDate = query?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default
    const endDate = query?.endDate || new Date();

    // Base query builder with common filters
    const baseQb = this.repository.createQueryBuilder('metric')
      .where('metric.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (query?.notificationId) {
      baseQb.andWhere('metric.notificationId = :notificationId', { notificationId: query.notificationId });
    }

    // Get aggregate stats
    const stats = await baseQb.clone()
      .select('COUNT(DISTINCT metric.recipientId)', 'total')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.openedAt IS NOT NULL THEN metric.recipientId END)', 'opened')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.clickedAt IS NOT NULL THEN metric.recipientId END)', 'clicked')
      .addSelect('AVG(CASE WHEN metric.openedAt IS NOT NULL AND metric.clickedAt IS NOT NULL THEN TIMESTAMPDIFF(MICROSECOND, metric.openedAt, metric.clickedAt) / 1000 END)', 'avgTimeToClick')
      .getRawOne();

    const totalSent = parseInt(stats.total) || 0;
    const totalOpened = parseInt(stats.opened) || 0;
    const totalClicked = parseInt(stats.clicked) || 0;
    const avgTimeToClick = stats.avgTimeToClick ? parseFloat(stats.avgTimeToClick) : null;

    // Device type breakdown
    const deviceStats = await baseQb.clone()
      .select('metric.deviceType', 'deviceType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(CASE WHEN metric.openedAt IS NOT NULL THEN 1 END)', 'opened')
      .addSelect('COUNT(CASE WHEN metric.clickedAt IS NOT NULL THEN 1 END)', 'clicked')
      .groupBy('metric.deviceType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const byDeviceType: DeviceTypeStats[] = deviceStats.map((row: any) => ({
      deviceType: row.deviceType || 'unknown',
      count: parseInt(row.count),
      openRate: row.count > 0 ? (parseInt(row.opened) / row.count) * 100 : 0,
      clickRate: row.count > 0 ? (parseInt(row.clicked) / row.count) * 100 : 0,
    }));

    // Notification type breakdown (join with notification table)
    const notificationTypeStats = await baseQb.clone()
      .innerJoin('notifications', 'n', 'n.notificationId = metric.notificationId')
      .select('n.notificationType', 'notificationType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(CASE WHEN metric.openedAt IS NOT NULL THEN 1 END)', 'opened')
      .addSelect('COUNT(CASE WHEN metric.clickedAt IS NOT NULL THEN 1 END)', 'clicked')
      .groupBy('n.notificationType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const byNotificationType: NotificationTypeStats[] = notificationTypeStats.map((row: any) => ({
      notificationType: row.notificationType || 'unknown',
      count: parseInt(row.count),
      openRate: row.count > 0 ? (parseInt(row.opened) / row.count) * 100 : 0,
      clickRate: row.count > 0 ? (parseInt(row.clicked) / row.count) * 100 : 0,
    }));

    // Top performing notifications
    const topNotifications = await baseQb.clone()
      .innerJoin('notifications', 'n', 'n.notificationId = metric.notificationId')
      .select('metric.notificationId', 'notificationId')
      .addSelect('n.title', 'title')
      .addSelect('n.notificationType', 'notificationType')
      .addSelect('COUNT(DISTINCT metric.recipientId)', 'sentCount')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.openedAt IS NOT NULL THEN metric.recipientId END)', 'openedCount')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.clickedAt IS NOT NULL THEN metric.recipientId END)', 'clickedCount')
      .groupBy('metric.notificationId')
      .addGroupBy('n.title')
      .addGroupBy('n.notificationType')
      .orderBy('openedCount', 'DESC')
      .limit(10)
      .getRawMany();

    const topNotificationsFormatted: TopNotification[] = topNotifications.map((row: any) => ({
      notificationId: parseInt(row.notificationId),
      title: row.title,
      notificationType: row.notificationType,
      sentCount: parseInt(row.sentCount),
      openRate: row.sentCount > 0 ? (parseInt(row.openedCount) / row.sentCount) * 100 : 0,
      clickRate: row.openedCount > 0 ? (parseInt(row.clickedCount) / row.openedCount) * 100 : 0,
    }));

    // Trend data (daily)
    const trendData = await baseQb.clone()
      .select("DATE_FORMAT(metric.createdAt, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(DISTINCT metric.recipientId)', 'sent')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.openedAt IS NOT NULL THEN metric.recipientId END)', 'opened')
      .addSelect('COUNT(DISTINCT CASE WHEN metric.clickedAt IS NOT NULL THEN metric.recipientId END)', 'clicked')
      .groupBy("DATE_FORMAT(metric.createdAt, '%Y-%m-%d')")
      .orderBy('date', 'ASC')
      .getRawMany();

    const trendDataFormatted: TrendDataPoint[] = trendData.map((row: any) => ({
      date: row.date,
      sent: parseInt(row.sent),
      opened: parseInt(row.opened),
      clicked: parseInt(row.clicked),
    }));

    return {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickThroughRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      avgTimeToClick,
      byDeviceType,
      byNotificationType,
      topNotifications: topNotificationsFormatted,
      trendData: trendDataFormatted,
    };
  }

  /**
   * ดึง engagement stats สำหรับ user
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
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.repository.createQueryBuilder('metric')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN metric.openedAt IS NOT NULL THEN 1 END)', 'opened')
      .addSelect('COUNT(CASE WHEN metric.clickedAt IS NOT NULL THEN 1 END)', 'clicked')
      .addSelect('AVG(CASE WHEN metric.openedAt IS NOT NULL AND metric.clickedAt IS NOT NULL THEN TIMESTAMPDIFF(MICROSECOND, metric.openedAt, metric.clickedAt) / 1000 END)', 'avgTimeToClick')
      .addSelect('metric.deviceType', 'deviceType')
      .addSelect('COUNT(*)', 'deviceCount')
      .where('metric.userId = :userId', { userId })
      .andWhere('metric.createdAt >= :startDate', { startDate })
      .groupBy('metric.deviceType')
      .orderBy('deviceCount', 'DESC')
      .limit(1)
      .getRawOne();

    const totalNotifications = parseInt(stats.total) || 0;
    const openedCount = parseInt(stats.opened) || 0;
    const clickedCount = parseInt(stats.clicked) || 0;

    return {
      totalNotifications,
      openedCount,
      clickedCount,
      openRate: totalNotifications > 0 ? (openedCount / totalNotifications) * 100 : 0,
      clickRate: openedCount > 0 ? (clickedCount / openedCount) * 100 : 0,
      avgTimeToClick: stats.avgTimeToClick ? parseFloat(stats.avgTimeToClick) : null,
      mostActiveDevice: stats.deviceType || 'unknown',
    };
  }

  /**
   * Cleanup metrics เก่า (สำหรับ maintenance)
   * @param olderThan วันที่ที่ต้องการลบ (เช่น 90 วัน)
   * @returns จำนวนแถวที่ลบ
   */
  async cleanupOldMetrics(olderThan: Date): Promise<number> {
    const result = await this.repository.delete({
      createdAt: LessThan(olderThan),
    });
    return result.affected || 0;
  }
}