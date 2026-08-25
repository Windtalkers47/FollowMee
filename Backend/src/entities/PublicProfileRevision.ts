import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PublicProfile } from './PublicProfile';

@Entity('public_profile_revisions')
@Index('UQ_profile_revision_version', ['profileId', 'version'], { unique: true })
export class PublicProfileRevision {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) revisionId!: string;
  @Column({ type: 'varchar', length: 36 }) profileId!: string;
  @ManyToOne(() => PublicProfile, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'profileId' }) profile!: PublicProfile;
  @Column({ type: 'int', unsigned: true }) version!: number;
  @Column({ type: 'json' }) snapshot!: Record<string, unknown>;
  @Column({ type: 'int', nullable: true }) actorUserId!: number | null;
  @Column({ type: 'varchar', length: 24 }) reason!: 'autosave' | 'manual' | 'publish' | 'unpublish' | 'restore' | 'merge';
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}
