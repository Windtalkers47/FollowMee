import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('user_audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  logId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('int', { nullable: true })
  userId!: number | null;

  @Column('varchar', { length: 50 })
  action!: string;

  @Column('varchar', { length: 20 })
  status!: 'SUCCESS' | 'FAILURE';

  @Column('varchar', { length: 45, nullable: true })
  ipAddress!: string | null;

  @Column('text', { nullable: true })
  userAgent!: string | null;

  @Column('text', { nullable: true })
  details!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  getDetails(): Record<string, any> | null {
    if (!this.details) return null;
    try {
      return JSON.parse(this.details);
    } catch {
      return null;
    }
  }
}

