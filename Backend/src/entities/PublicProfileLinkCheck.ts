import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PublicProfile } from './PublicProfile';

export type ProfileLinkHealth = 'ok' | 'warning' | 'invalid' | 'unchecked';

@Entity('public_profile_link_checks')
@Index('IDX_profile_link_checks_profile_target', ['profileId', 'targetKey', 'checkedAt'])
export class PublicProfileLinkCheck {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) checkId!: string;
  @Column({ type: 'varchar', length: 36 }) profileId!: string;
  @ManyToOne(() => PublicProfile, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'profileId' }) profile!: PublicProfile;
  @Column({ type: 'varchar', length: 64 }) targetKey!: string;
  @Column({ type: 'varchar', length: 512 }) url!: string;
  @Column({ type: 'varchar', length: 16, default: 'unchecked' }) status!: ProfileLinkHealth;
  @Column({ type: 'smallint', unsigned: true, nullable: true }) httpStatus!: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) detail!: string | null;
  @CreateDateColumn({ type: 'datetime', name: 'checkedAt' }) checkedAt!: Date;
}
