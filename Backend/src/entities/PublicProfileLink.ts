import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PublicProfile } from './PublicProfile';

@Entity('public_profile_links')
@Index('IDX_public_profile_links_order', ['profileId', 'sortOrder'])
export class PublicProfileLink {
  @PrimaryGeneratedColumn({ type: 'int' })
  linkId!: number;

  @Column({ type: 'varchar', length: 36 })
  profileId!: string;

  @ManyToOne(() => PublicProfile, (profile) => profile.links, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profileId' })
  profile!: PublicProfile;

  @Column({ type: 'varchar', length: 32 })
  platform!: string;

  @Column({ type: 'varchar', length: 60 })
  label!: string;

  @Column({ type: 'varchar', length: 512 })
  url!: string;

  @Column({ type: 'smallint', unsigned: true, default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}

