import { CustomerAccessService, CustomerAccessContext } from '../../services/customer-access.service';

const customer = { createdBy: 10, assignedTo: 20 };
const access = (userId: number, isOwner = false): CustomerAccessContext => ({ userId, isOwner });

describe('CustomerAccessService resource matrix', () => {
  const service = new CustomerAccessService();

  it('lets everyone view and create without granting unrelated edit rights', () => {
    expect(service.capabilities(customer, access(30))).toEqual({
      canView: true,
      canEdit: false,
      canReassign: false,
      canDelete: false,
      canPublish: false,
    });
  });

  it('lets the assignee edit but not reassign, publish, or delete', () => {
    expect(service.capabilities(customer, access(20))).toMatchObject({
      canEdit: true,
      canReassign: false,
      canDelete: false,
      canPublish: false,
    });
  });

  it('lets the creator control assignment and publication', () => {
    expect(service.capabilities(customer, access(10))).toMatchObject({
      canEdit: true,
      canReassign: true,
      canDelete: true,
      canPublish: true,
    });
  });

  it('lets Owner override every customer resource', () => {
    expect(service.capabilities(customer, access(99, true))).toMatchObject({
      canEdit: true,
      canReassign: true,
      canDelete: true,
      canPublish: true,
    });
  });
});
