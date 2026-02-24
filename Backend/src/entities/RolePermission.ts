import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './Role';
import { Permission } from './Permission';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn('int')
  roleId!: number;

  @PrimaryColumn('int')
  permissionId!: number;

  @ManyToOne(() => Role, role => role.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @ManyToOne(() => Permission, permission => permission.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission!: Permission;
}
