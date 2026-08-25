import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PublicProfile } from './PublicProfile';

export type ProfileDomainStatus = 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';

@Entity('public_profile_domains')
@Index('UQ_profile_domain_hostname', ['hostname'], { unique: true })
export class PublicProfileDomain {
  @PrimaryGeneratedColumn('uuid', { name: 'domainId' }) domainId!: string;
  @Column({ type: 'varchar', length: 36 }) profileId!: string;
  @ManyToOne(() => PublicProfile, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'profileId' }) profile!: PublicProfile;
  @Column({ type: 'varchar', length: 253 }) hostname!: string;
  @Column({ type: 'varchar', length: 16, default: 'pending' }) status!: ProfileDomainStatus;
  @Column({ type: 'json', nullable: true }) verification!: Record<string, unknown> | null;
  @Column({ type: 'boolean', default: false }) isCanonical!: boolean;
  @Column({ type: 'boolean', default: true }) redirectToCanonical!: boolean;
  @Column({ type: 'datetime', nullable: true }) verifiedAt!: Date | null;
  @Column({ type: 'datetime', nullable: true }) lastCheckedAt!: Date | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) lastError!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
