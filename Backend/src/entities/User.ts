import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsEmail, IsNotEmpty } from 'class-validator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({ length: 50 })
  @IsNotEmpty()
  userName: string;

  @Column({ length: 50 })
  @IsNotEmpty()
  userLastName: string;

  @Column({ length: 100 })
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  userPassword: string;

  @Column({ length: 20, nullable: true })
  userPhone1?: string;

  @Column({ length: 20, nullable: true })
  userPhone2?: string;

  @Column({ default: true })
  isActive: boolean = true;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Helper method to get full name
  get fullName(): string {
    return `${this.userName} ${this.userLastName}`.trim();
  }
}

export default User;
