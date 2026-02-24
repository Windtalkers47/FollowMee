import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { RolePermission } from './RolePermission';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  permissionId!: number;

  @Column('varchar', { length: 100, unique: true })
  @IsNotEmpty()
  @MaxLength(100)
  permissionName!: string;

  @Column('varchar', { length: 255, nullable: true })
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
  rolePermissions!: RolePermission[];
}
