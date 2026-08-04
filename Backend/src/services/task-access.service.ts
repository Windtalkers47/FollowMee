import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { Task } from '../entities/Task';
import { TaskActionError } from '../errors/task-transition.error';

export interface TaskAccessContext {
  userId: number;
  isOwner: boolean;
}

export class TaskAccessService {
  async context(userId: number): Promise<TaskAccessContext> {
    const user = await AppDataSource.getRepository(User).findOne({ where: { userId }, relations: ['userRoles', 'userRoles.role'] });
    const roles = user?.userRoles?.map(item => item.role.roleName) || [];
    return {
      userId,
      isOwner: roles.includes('Owner'),
    };
  }

  canView(task: Pick<Task, 'createdBy' | 'status'>, access: TaskAccessContext): boolean {
    return task.status !== 'draft' || task.createdBy === access.userId || access.isOwner;
  }

  canManage(task: Pick<Task, 'createdBy'>, access: TaskAccessContext): boolean {
    return task.createdBy === access.userId || access.isOwner;
  }

  assertView(task: Pick<Task, 'createdBy' | 'status'>, access: TaskAccessContext): void {
    if (!this.canView(task, access)) throw new TaskActionError('This draft is private to its creator', 'view', 403, task.status);
  }

  assertManage(task: Pick<Task, 'createdBy' | 'status'>, access: TaskAccessContext): void {
    if (!this.canManage(task, access)) throw new TaskActionError('Only the creator or Owner can manage this task', 'manage_task', 403, task.status);
  }

  async assertActiveUsers(userIds: number[]): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return;
    const count = await AppDataSource.getRepository(User).createQueryBuilder('user')
      .where('user.isActive=1')
      .andWhere('user.userId IN (:...userIds)', { userIds: unique })
      .getCount();
    if (count !== unique.length) throw Object.assign(new Error('Assignees and watchers must be active organization users'), { statusCode: 400, code: 'TASK_ACTIVE_USER_REQUIRED' });
  }
}

export const taskAccessService = new TaskAccessService();
