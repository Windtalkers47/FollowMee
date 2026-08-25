import {
  resolveManagedUserCapabilities,
  resolveUserManagementCapabilities,
} from '../../utils/user-management-capabilities';

describe('user management capabilities', () => {
  it('derives page capabilities from permissions and system ownership', () => {
    expect(resolveUserManagementCapabilities(7, ['CREATE_USERS', 'MANAGE_ROLES', 'DELETE_USERS'], 7)).toEqual({
      canInviteUsers: true,
      canManageRoles: true,
      canDeactivateUsers: true,
      canTransferOwnership: true,
    });
  });

  it('protects self and the system owner per user', () => {
    const page = resolveUserManagementCapabilities(7, ['UPDATE_USERS', 'DELETE_USERS'], 7);
    expect(resolveManagedUserCapabilities(7, 7, 7, page)).toEqual({ canEditRole: false, canDeactivate: false, canReceiveTransfer: false });
    expect(resolveManagedUserCapabilities(7, 9, 7, page)).toEqual({ canEditRole: true, canDeactivate: true, canReceiveTransfer: true });
  });
});
