import bcrypt from 'bcryptjs';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { UserRole } from '../entities/UserRole';
import { Role } from '../entities/Role';
import { ApplicationError } from '../errors/application.error';
import { OWNER_ROLE } from '../utils/role.util';
import { NotificationHelper } from '../utils/notification.util';
import { webSocketService } from './websocket.service';

export class OwnerService {
  async getCurrentOwner() {
    const rows = await AppDataSource.query(`
      SELECT u.userId, u.userName, u.userLastName, u.userEmail, u.userImageUrl, so.updatedAt
      FROM system_owner so
      INNER JOIN users u ON u.userId = so.userId
      WHERE so.singletonId = 1
      LIMIT 1
    `);
    return rows[0] || null;
  }

  async transferOwner(actorUserId: number, targetUserId: number, currentPassword: string) {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0 || !currentPassword) {
      throw new ApplicationError('Target user and current password are required', 'OWNER_TRANSFER_INVALID', 400);
    }

    const actor = await AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.userPassword')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('user.userId = :actorUserId', { actorUserId })
      .getOne();
    if (!actor || !actor.userRoles?.some(item => item.role?.roleName === OWNER_ROLE)) {
      throw new ApplicationError('Only the current Owner can transfer ownership', 'OWNER_TRANSFER_FORBIDDEN', 403);
    }
    if (!(await bcrypt.compare(currentPassword, actor.userPassword))) {
      throw new ApplicationError('Current password is incorrect', 'OWNER_PASSWORD_INVALID', 403);
    }

    const target = await AppDataSource.getRepository(User).findOne({ where: { userId: targetUserId, isActive: true } });
    if (!target) throw new ApplicationError('Target user was not found or is inactive', 'OWNER_TARGET_INVALID', 404);
    if (actorUserId === targetUserId) {
      throw new ApplicationError('This user is already the Owner', 'OWNER_ALREADY_ASSIGNED', 409);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const ownerRows = await queryRunner.query('SELECT userId FROM system_owner WHERE singletonId = 1 FOR UPDATE');
      if (Number(ownerRows[0]?.userId) !== actorUserId) {
        throw new ApplicationError('Ownership changed in another session', 'OWNER_TRANSFER_CONFLICT', 409);
      }
      const ownerRole = await queryRunner.manager.getRepository(Role).findOne({ where: { roleName: OWNER_ROLE, isActive: true } });
      const adminRole = await queryRunner.manager.getRepository(Role).findOne({ where: { roleName: 'Admin', isActive: true } });
      if (!ownerRole || !adminRole) throw new ApplicationError('Required Owner/Admin roles are unavailable', 'OWNER_ROLE_CONFIG_INVALID', 409);

      const userRoles = queryRunner.manager.getRepository(UserRole);
      await userRoles.delete([{ userId: actorUserId }, { userId: targetUserId }]);
      await userRoles.insert([
        { userId: actorUserId, roleId: adminRole.roleId },
        { userId: targetUserId, roleId: ownerRole.roleId },
      ]);
      await queryRunner.query('UPDATE system_owner SET userId = ?, updatedAt = CURRENT_TIMESTAMP(6) WHERE singletonId = 1', [targetUserId]);
      await queryRunner.query(`
        INSERT INTO user_audit_logs
          (userId, entityType, entityId, action, status, details, oldValue, newValue)
        VALUES (?, 'system_owner', '1', 'TRANSFER_OWNER', 'SUCCESS', ?, ?, ?)
      `, [actorUserId, JSON.stringify({ targetUserId }), String(actorUserId), String(targetUserId)]);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await Promise.allSettled([
      NotificationHelper.notifyRoleChanged('Admin', actorUserId, [actorUserId], actorUserId),
      NotificationHelper.notifyRoleChanged(OWNER_ROLE, actorUserId, [targetUserId], targetUserId),
    ]);
    const changedAt = new Date().toISOString();
    webSocketService.emitDomainEvent('owner:transferred', {
      previousOwnerUserId: actorUserId,
      currentOwnerUserId: targetUserId,
      actorUserId,
      updatedAt: changedAt,
    }, [actorUserId, targetUserId]);

    return {
      previousOwner: { userId: actorUserId, role: 'Admin' },
      currentOwner: { userId: targetUserId, role: OWNER_ROLE },
      changedAt,
    };
  }
}
