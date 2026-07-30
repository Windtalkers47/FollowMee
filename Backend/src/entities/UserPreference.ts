import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User';

export type UserLocale = 'en' | 'th';
export type BrandTheme = 'purple' | 'green';
export type ColorModePreference = 'light' | 'dark' | 'system';

@Entity('user_preferences')
@Index(['userId'], { unique: true })
export class UserPreference {
  @PrimaryGeneratedColumn()
  preferenceId!: number;

  @Column({ type: 'int', unique: true })
  userId!: number;

  @Column({ type: 'enum', enum: ['en', 'th'], default: 'en' })
  locale: UserLocale = 'en';

  @Column({ type: 'enum', enum: ['purple', 'green'], default: 'purple' })
  brandTheme: BrandTheme = 'purple';

  @Column({ type: 'enum', enum: ['light', 'dark', 'system'], default: 'system' })
  colorMode: ColorModePreference = 'system';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
