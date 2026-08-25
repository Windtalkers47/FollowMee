import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PublicProfile } from './PublicProfile';

export type PublicProfileLeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'spam' | 'archived';

@Entity('public_profile_leads')
@Index('IDX_profile_leads_profile_status_created', ['profileId', 'status', 'createdAt'])
@Index('IDX_profile_leads_retention', ['status', 'createdAt'])
export class PublicProfileLead {
  @PrimaryGeneratedColumn('uuid', { name: 'leadId' }) leadId!: string;
  @Column({ type: 'varchar', length: 36 }) profileId!: string;
  @ManyToOne(() => PublicProfile, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'profileId' }) profile!: PublicProfile;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', length: 32, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 1000, nullable: true }) message!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'new' }) status!: PublicProfileLeadStatus;
  @Column({ type: 'datetime' }) consentAt!: Date;
  @Column({ type: 'varchar', length: 24, default: '2026-08' }) consentVersion!: string;
  @Column({ type: 'int', nullable: true }) assignedTo!: number | null;
  @Column({ type: 'varchar', length: 36, nullable: true }) convertedCustomerId!: string | null;
  @Column({ type: 'datetime', nullable: true }) convertedAt!: Date | null;
  @Column({ type: 'char', length: 64, nullable: true }) visitorHash!: string | null;
  @Column({ type: 'char', length: 64, nullable: true }) ipHash!: string | null;
  @Column({ type: 'char', length: 64, nullable: true }) userAgentHash!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'unknown' }) deviceType!: string;
  @Column({ type: 'varchar', length: 512, nullable: true }) referrer!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) utmSource!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) utmMedium!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) utmCampaign!: string | null;
  @Column({ type: 'datetime', nullable: true }) anonymizedAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}
