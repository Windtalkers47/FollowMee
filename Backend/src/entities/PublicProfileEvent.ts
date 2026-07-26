import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PublicProfile } from './PublicProfile';

export type PublicProfileEventType =
  | 'view'
  | 'link_click'
  | 'cta_click'
  | 'share'
  | 'image_export'
  | 'qr_open';

@Entity('public_profile_events')
@Index('IDX_public_profile_events_profile_date', ['profileId', 'occurredAt'])
@Index('IDX_public_profile_events_profile_type', ['profileId', 'eventType'])
export class PublicProfileEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  eventId!: string;

  @Column({ type: 'varchar', length: 36 })
  profileId!: string;

  @ManyToOne(() => PublicProfile, (profile) => profile.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profileId' })
  profile!: PublicProfile;

  @Column({ type: 'varchar', length: 32 })
  eventType!: PublicProfileEventType;

  @Column({ type: 'varchar', length: 128, nullable: true })
  target!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'unknown' })
  deviceType!: string;

  @Column({ type: 'char', length: 64, nullable: true })
  ipHash!: string | null;

  @Column({ type: 'char', length: 64, nullable: true })
  userAgentHash!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  referrer!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'occurredAt' })
  occurredAt!: Date;
}
