import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './Customer';
import { User } from './User';
import { PublicProfileLink } from './PublicProfileLink';
import { PublicProfileEvent } from './PublicProfileEvent';

export type PublicProfileStatus = 'draft' | 'published';
export type PublicProfileVisibility = 'public' | 'unlisted' | 'private';

export interface PublicProfileTheme {
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontStyle?: 'modern' | 'friendly' | 'editorial';
}

@Entity('public_profiles')
@Index('UQ_public_profiles_slug', ['slug'], { unique: true })
@Index('IDX_public_profiles_owner_status', ['userId', 'status'])
@Index('UQ_public_profiles_customer', ['customerId'], { unique: true })
export class PublicProfile {
  @PrimaryGeneratedColumn('uuid', { name: 'profileId' })
  profileId!: string;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'int', nullable: true })
  createdBy!: number | null;

  @Column({ type: 'int', nullable: true })
  updatedBy!: number | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  customerId!: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer | null;

  @Column({ type: 'varchar', length: 64 })
  slug!: string;

  @Column({ type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ type: 'varchar', length: 140, nullable: true })
  headline!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'json', nullable: true })
  imageCrop!: { x: number; y: number; zoom: number; rotation: number } | null;

  @Column({ type: 'varchar', length: 32, default: 'soft-mint' })
  templateKey!: string;

  @Column({ type: 'json', nullable: true })
  themeConfig!: PublicProfileTheme | null;

  @Column({
    type: 'enum',
    enum: ['draft', 'published'],
    default: 'draft',
  })
  status!: PublicProfileStatus;

  @Column({
    type: 'enum',
    enum: ['public', 'unlisted', 'private'],
    default: 'private',
  })
  visibility!: PublicProfileVisibility;

  @Column({ type: 'varchar', length: 60, nullable: true })
  primaryCtaLabel!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  primaryCtaUrl!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  secondaryCtaLabel!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  secondaryCtaUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  showEmail!: boolean;

  @Column({ type: 'boolean', default: false })
  showPhone!: boolean;

  @Column({ type: 'boolean', default: false })
  showAddress!: boolean;

  @Column({ type: 'varchar', length: 70, nullable: true })
  seoTitle!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  seoDescription!: string | null;

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  viewCount!: string;

  @Column({ type: 'datetime', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => PublicProfileLink, (link) => link.profile, {
    cascade: true,
  })
  links!: PublicProfileLink[];

  @OneToMany(() => PublicProfileEvent, (event) => event.profile)
  events!: PublicProfileEvent[];
}
