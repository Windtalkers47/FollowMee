import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('privacy_requests')
export class PrivacyRequest {
  @PrimaryGeneratedColumn('uuid') requestId!: string;
  @Column('varchar', { length: 100 }) email!: string;
  @Column('varchar', { length: 24 }) requestType!: 'access' | 'correction' | 'deletion' | 'withdrawal' | 'other';
  @Column('text', { nullable: true }) message!: string | null;
  @Column('varchar', { length: 20, default: 'pending_email' }) status!: 'pending_email' | 'open' | 'in_progress' | 'completed' | 'rejected' | 'expired';
  @Column('char', { length: 64, nullable: true, select: false }) verificationTokenHash!: string | null;
  @Column('datetime', { nullable: true }) verificationExpiresAt!: Date | null;
  @Column('datetime', { nullable: true }) verifiedAt!: Date | null;
  @Column('int', { nullable: true }) assignedTo!: number | null;
  @Column('datetime', { nullable: true }) resolvedAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
