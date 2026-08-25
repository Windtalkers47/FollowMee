import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type RegistrationRequestStatus = 'pending_email' | 'pending_approval' | 'approved' | 'rejected' | 'expired';

@Entity('registration_requests')
export class RegistrationRequest {
  @PrimaryGeneratedColumn('uuid') requestId!: string;
  @Column('varchar', { length: 100, unique: true }) email!: string;
  @Column('varchar', { length: 50 }) userName!: string;
  @Column('varchar', { length: 50 }) userLastName!: string;
  @Column('varchar', { length: 20, nullable: true }) userPhone1!: string | null;
  @Column('varchar', { length: 255, select: false }) passwordHash!: string;
  @Column('varchar', { length: 20, default: 'pending_email' }) status!: RegistrationRequestStatus;
  @Column('char', { length: 64, nullable: true, select: false }) verificationTokenHash!: string | null;
  @Column('datetime', { nullable: true }) verificationExpiresAt!: Date | null;
  @Column('datetime', { nullable: true }) verifiedAt!: Date | null;
  @Column('int', { nullable: true }) reviewedBy!: number | null;
  @Column('datetime', { nullable: true }) reviewedAt!: Date | null;
  @Column('varchar', { length: 500, nullable: true }) reviewReason!: string | null;
  @Column('varchar', { length: 24 }) termsVersion!: string;
  @Column('varchar', { length: 24 }) privacyVersion!: string;
  @Column('datetime') consentAt!: Date;
  @Column('char', { length: 64, nullable: true }) ipHash!: string | null;
  @Column('char', { length: 64, nullable: true }) funnelSessionHash!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
