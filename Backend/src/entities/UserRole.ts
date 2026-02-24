import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Role } from './Role';

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn('int')
  userId!: number;

  @PrimaryColumn('int')
  roleId!: number;

  @ManyToOne(() => User, user => user.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Role, role => role.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role!: Role;
}
