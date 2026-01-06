import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('int')
  userId!: number;

  @Column('varchar', { length: 255, unique: true })
  refreshToken!: string;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress!: string | null;

  @Column('text', { nullable: true })
  userAgent!: string | null;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column('timestamp', { nullable: true })
  revokedAt!: Date | null;

  @Column('timestamp')
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  /**
   * Check if the session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Revoke the session
   */
  revoke(): void {
    this.isActive = false;
    this.revokedAt = new Date();
  }
}

