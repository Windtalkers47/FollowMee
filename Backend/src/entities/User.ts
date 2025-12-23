import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import * as bcrypt from 'bcryptjs';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userId!: number;

  @Column({ length: 50 })
  @IsNotEmpty()
  userName!: string;

  @Column({ length: 50 })
  @IsNotEmpty()
  userLastName!: string;

  @Column({ length: 100, unique: true })
  @IsEmail()
  @IsNotEmpty()
  userEmail!: string;

  @Column({ length: 255, select: false })
  @IsNotEmpty()
  userPassword!: string;

  @Column({ length: 255, nullable: true, select: false })
  userPasswordHash?: string;

  @Column({ length: 20, nullable: true })
  @IsOptional()
  userPhone1?: string;

  @Column({ length: 20, nullable: true })
  @IsOptional()
  userPhone2?: string;

  @Column({ default: true })
  isActive: boolean = true;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ nullable: true, select: false })
  resetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpires?: Date;

  @Column({ length: 50, nullable: true })
  userRole?: string;

  // Hash password before saving
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.userPassword) {
      const salt = await bcrypt.genSalt();
      this.userPasswordHash = await bcrypt.hash(this.userPassword, salt);
      // Don't store plain password
      this.userPassword = '';
    }
  }

  // Verify password
  async verifyPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.userPasswordHash || '');
  }

  // Helper method to get full name (optional)
  get fullName(): string {
    return `${this.userName || ''} ${this.userLastName || ''}`.trim();
  }
}

// Export only the named export
