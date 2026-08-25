export interface UserManagementCapabilities {
  canInviteUsers: boolean;
  canManageRoles: boolean;
  canDeactivateUsers: boolean;
  canTransferOwnership: boolean;
}

export interface ManagedUserCapabilities {
  canEditRole: boolean;
  canDeactivate: boolean;
  canReceiveTransfer: boolean;
}

export const resolveUserManagementCapabilities = (
  actorUserId: number,
  permissions: readonly string[],
  ownerUserId: number | null,
): UserManagementCapabilities => ({
  canInviteUsers: permissions.includes('CREATE_USERS'),
  canManageRoles: permissions.includes('MANAGE_ROLES') || permissions.includes('UPDATE_USERS'),
  canDeactivateUsers: permissions.includes('DELETE_USERS'),
  canTransferOwnership: ownerUserId === actorUserId,
});

export const resolveManagedUserCapabilities = (
  actorUserId: number,
  targetUserId: number,
  ownerUserId: number | null,
  capabilities: UserManagementCapabilities,
): ManagedUserCapabilities => {
  const isOwner = targetUserId === ownerUserId;
  const isSelf = targetUserId === actorUserId;
  return {
    canEditRole: capabilities.canManageRoles && !isOwner,
    canDeactivate: capabilities.canDeactivateUsers && !isOwner && !isSelf,
    canReceiveTransfer: capabilities.canTransferOwnership && !isOwner && !isSelf,
  };
};
