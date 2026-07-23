import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Notification } from './Notification';
import { User } from './User';
import { NotificationRecipient } from './NotificationRecipient';

/**
 * NotificationMetric - สำหรับติดตามการเปิดและการคลิก notification
 * 
 * Design Considerations:
 * 1. Cost-effective: เก็บเฉพาะข้อมูลที่จำเป็นสำหรับ analytics
 * 2. Performance: ใช้ indexes เพื่อ optimize queries
 * 3. Privacy: เก็บ deviceType แทน full userAgent เพื่อลด storage
 * 4. Scalability: แยก table ต่างหากเพื่อไม่กระทบ performance ของ notification หลัก
 */
@Entity('notification_metrics')
@Index(['userId', 'createdAt'])
@Index(['notificationId', 'createdAt'])
@Index(['recipientId'])
@Index(['openedAt'])
@Index(['clickedAt'])
export class NotificationMetric {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  metricId!: number;

  @Column({ name: 'recipientId', type: 'int', nullable: false })
  recipientId!: number;

  @Column({ name: 'userId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'notificationId', type: 'bigint', nullable: false })
  notificationId!: number;

  /**
   * Timestamp เมื่อผู้ใช้เปิด notification
   * (เมื่อคลิกที่ notification card)
   */
  @Column({ name: 'openedAt', type: 'timestamp', nullable: true })
  openedAt?: Date;

  /**
   * Timestamp เมื่อผู้ใช้คลิก actionUrl
   * (ถ้า notification มี actionUrl)
   */
  @Column({ name: 'clickedAt', type: 'timestamp', nullable: true })
  clickedAt?: Date;

  /**
   * ประเภทอุปกรณ์ที่ใช้งาน
   * Values: 'mobile', 'tablet', 'desktop', 'unknown'
   */
  @Column({ name: 'deviceType', type: 'varchar', length: 20, default: 'unknown' })
  deviceType: string = 'unknown';

  /**
   * Browser type (อย่างย่อ)
   * Values: 'chrome', 'firefox', 'safari', 'edge', 'other'
   */
  @Column({ name: 'browserType', type: 'varchar', length: 20, default: 'unknown' })
  browserType: string = 'unknown';

  /**
   * Operating system (อย่างย่อ)
   * Values: 'windows', 'macos', 'linux', 'ios', 'android', 'other'
   */
  @Column({ name: 'osType', type: 'varchar', length: 20, default: 'unknown' })
  osType: string = 'unknown';

  /**
   * Session ID สำหรับ grouping events
   * ใช้สำหรับวิเคราะห์ user session
   */
  @Column({ name: 'sessionId', type: 'varchar', length: 100, nullable: true })
  sessionId?: string;

  /**
   * IP Address (hash แล้วเพื่อ privacy)
   * ใช้สำหรับ geolocation และ fraud detection
   */
  @Column({ name: 'ipHash', type: 'varchar', length: 64, nullable: true })
  ipHash?: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => NotificationRecipient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient?: NotificationRecipient;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification?: Notification;

  /**
   * Helper method: คำนวณเวลาจากเปิดถึงการคลิก
   * @returns เวลาเป็น milliseconds หรือ null ถ้ายังไม่ได้คลิก
   */
  getTimeToClick(): number | null {
    if (!this.openedAt || !this.clickedAt) {
      return null;
    }
    return this.clickedAt.getTime() - this.openedAt.getTime();
  }

  /**
   * Helper method: ตรวจสอบว่าเปิดแล้วหรือยัง
   */
  isOpened(): boolean {
    return this.openedAt !== null && this.openedAt !== undefined;
  }

  /**
   * Helper method: ตรวจสอบว่าคลิกแล้วหรือยัง
   */
  isClicked(): boolean {
    return this.clickedAt !== null && this.clickedAt !== undefined;
  }
}