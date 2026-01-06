import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userId!: number;

  @Column('varchar', { length: 50 })
  @IsNotEmpty()
  userName!: string;

  @Column('varchar', { length: 50 })
  @IsNotEmpty()
  userLastName!: string;

  @Column('varchar', { length: 100, unique: true })
  @IsEmail()
  @IsNotEmpty()
  userEmail!: string;

  @Column('varchar', { length: 255, select: false })
  @IsNotEmpty()
  userPassword!: string;

  @Column('varchar', { length: 20, nullable: true })
  userPhone1!: string | null;

  @Column('varchar', { length: 20, nullable: true })
  userPhone2!: string | null;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column('varchar', { nullable: true, select: false })
  resetToken!: string | null;

  @Column('datetime', { nullable: true })
  resetTokenExpires!: Date | null;

  @Column('varchar', { length: 50, nullable: true })
  role!: string | null;

  // Login attempt tracking
  @Column('int', { default: 0, select: false })
  loginAttempts!: number;

  @Column('datetime', { nullable: true, select: false })
  lastLoginAttempt!: Date | null;

  @Column('datetime', { nullable: true, select: false })
  lockedUntil!: Date | null;

  @Column('datetime', { nullable: true })
  lastLogin!: Date | null;

  // -------------------------
  // Hooks
  // -------------------------
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (
      this.userPassword &&
      !this.userPassword.startsWith('$2a$') &&
      !this.userPassword.startsWith('$2b$')
    ) {
      this.userPassword = await bcrypt.hash(this.userPassword, 10);
    }
  }

  // -------------------------
  // Domain methods
  // -------------------------
  async verifyPassword(attempt: string): Promise<boolean> {
    return bcrypt.compare(attempt, this.userPassword);
  }

  get fullName(): string {
    return `${this.userName} ${this.userLastName}`.trim();
  }
}

