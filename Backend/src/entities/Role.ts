import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { RolePermission } from './RolePermission';
import { UserRole } from './UserRole';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  roleId!: number;

  @Column('varchar', { length: 50, unique: true })
  @IsNotEmpty()
  @MaxLength(50)
  roleName!: string;

  @Column('varchar', { length: 255, nullable: true })
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column('int', { default: 1 })
  roleLevel!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
  rolePermissions!: RolePermission[];

  @OneToMany(() => UserRole, userRole => userRole.role)
  userRoles!: UserRole[];

  // Helper methods
  get permissions(): string[] {
    return this.rolePermissions?.map(rp => rp.permission?.permissionName) || [];
  }
}
