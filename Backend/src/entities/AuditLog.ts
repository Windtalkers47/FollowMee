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

  @Column('varchar', { length: 50, nullable: true })
  entityType!: string | null;

  @Column('varchar', { length: 36, nullable: true })
  entityId!: string | null;

  @Column('varchar', { length: 50 })
  action!: string;

  @Column('varchar', { length: 20 })
  status!: string;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress!: string | null;

  @Column('text', { nullable: true })
  userAgent!: string | null;

  @Column('text', { nullable: true })
  details!: string | null;

  @Column('text', { nullable: true })
  oldValue!: string | null;

  @Column('text', { nullable: true })
  newValue!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

