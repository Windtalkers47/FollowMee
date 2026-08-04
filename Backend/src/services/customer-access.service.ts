import AppDataSource from '../config/database';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { ApplicationError } from '../errors/application.error';

export interface CustomerAccessContext {
  userId: number;
  isOwner: boolean;
}

export interface CustomerCapabilities {
  canView: true;
  canEdit: boolean;
  canReassign: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export class CustomerAccessService {
  async context(userId: number): Promise<CustomerAccessContext> {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { userId },
      relations: ['userRoles', 'userRoles.role'],
    });
    const roles = user?.userRoles?.map(item => item.role.roleName) || [];
    return { userId, isOwner: roles.includes('Owner') };
  }

  capabilities(customer: Pick<Customer, 'createdBy' | 'assignedTo'>, access: CustomerAccessContext): CustomerCapabilities {
    const isCreator = customer.createdBy === access.userId;
    const isAssignee = customer.assignedTo === access.userId;
    return {
      canView: true,
      canEdit: access.isOwner || isCreator || isAssignee,
      canReassign: access.isOwner || isCreator,
      canDelete: access.isOwner || isCreator,
      canPublish: access.isOwner || isCreator,
    };
  }

  assertEdit(customer: Pick<Customer, 'createdBy' | 'assignedTo'>, access: CustomerAccessContext): void {
    if (!this.capabilities(customer, access).canEdit) {
      throw new ApplicationError('Only the creator, assignee, or Owner can edit this customer', 'CUSTOMER_EDIT_FORBIDDEN', 403);
    }
  }

  assertReassign(customer: Pick<Customer, 'createdBy' | 'assignedTo'>, access: CustomerAccessContext): void {
    if (!this.capabilities(customer, access).canReassign) {
      throw new ApplicationError('Only the creator or Owner can change the assignee', 'CUSTOMER_REASSIGN_FORBIDDEN', 403);
    }
  }

  assertDelete(customer: Pick<Customer, 'createdBy' | 'assignedTo'>, access: CustomerAccessContext): void {
    if (!this.capabilities(customer, access).canDelete) {
      throw new ApplicationError('Only the creator or Owner can delete this customer', 'CUSTOMER_DELETE_FORBIDDEN', 403);
    }
  }

  async assertActiveAssignee(userId: number): Promise<void> {
    const exists = await AppDataSource.getRepository(User).exist({ where: { userId, isActive: true } });
    if (!exists) throw new ApplicationError('Assignee must be an active organization user', 'CUSTOMER_ASSIGNEE_INVALID', 400);
  }
}

export const customerAccessService = new CustomerAccessService();
