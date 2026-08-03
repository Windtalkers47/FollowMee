import AppDataSource from '../../config/database';
import { UserService } from '../../services/user.service';
import { NotificationHelper } from '../../utils/notification.util';

describe('UserService role replacement', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('replaces the single role in a transaction and returns the canonical user', async () => {
    const service = new UserService();
    (service as any).userRepository = {
      findOne: jest.fn().mockResolvedValue({ userId: 4, userName: 'Coca', userLastName: 'Cola' }),
    };
    (service as any).roleRepository = {
      findOne: jest.fn().mockResolvedValue({ roleId: 3, roleName: 'Customer' }),
    };

    const transactionRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    (AppDataSource as any).transaction = jest.fn(async (callback: any) => callback({
      getRepository: () => transactionRepository,
    }));
    (AppDataSource as any).query = jest.fn().mockResolvedValue([]);

    const canonicalUser = {
      userId: 4,
      userName: 'Coca',
      userLastName: 'Cola',
      roles: [{ roleId: 3, roleName: 'Customer' }],
      role: { roleId: 3, roleName: 'Customer' },
      permissions: [],
    } as any;
    jest.spyOn(service, 'getManagedUser').mockResolvedValue(canonicalUser);

    await expect(service.assignRoleToUser(4, 3)).resolves.toBe(canonicalUser);
    expect(transactionRepository.delete).toHaveBeenCalledWith({ userId: 4 });
    expect(transactionRepository.save).toHaveBeenCalledWith({ userId: 4, roleId: 3 });
  });

  it('keeps a successful role change when notification delivery fails', async () => {
    const service = new UserService();
    (service as any).userRepository = {
      findOne: jest.fn().mockResolvedValue({ userId: 4, userName: 'Coca', userLastName: 'Cola' }),
    };
    (service as any).roleRepository = {
      findOne: jest.fn().mockResolvedValue({ roleId: 2, roleName: 'Admin' }),
    };
    const transactionRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    (AppDataSource as any).transaction = jest.fn(async (callback: any) => callback({
      getRepository: () => transactionRepository,
    }));
    (AppDataSource as any).query = jest.fn().mockResolvedValue([]);
    const canonicalUser = {
      userId: 4,
      userName: 'Coca',
      userLastName: 'Cola',
      roles: [{ roleId: 2, roleName: 'Admin' }],
      role: { roleId: 2, roleName: 'Admin' },
      permissions: [],
    } as any;
    jest.spyOn(service, 'getManagedUser').mockResolvedValue(canonicalUser);
    const notification = jest.spyOn(NotificationHelper, 'notifyRoleChanged')
      .mockRejectedValue(new Error('WebSocket unavailable'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(service.assignRoleToUser(4, 2, 1)).resolves.toBe(canonicalUser);
    expect(notification).toHaveBeenCalledTimes(2);
    expect(notification).toHaveBeenCalledWith('Admin', 1, [4], 4);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('role_change_notification_failed'));
  });

  it('requires the dedicated transfer flow when assigning Owner', async () => {
    const service = new UserService();
    (service as any).userRepository = { findOne: jest.fn().mockResolvedValue({ userId: 4 }) };
    (service as any).roleRepository = { findOne: jest.fn().mockResolvedValue({ roleId: 1, roleName: 'Owner' }) };

    await expect(service.assignRoleToUser(4, 1, 4)).rejects.toMatchObject({ code: 'OWNER_TRANSFER_REQUIRED', statusCode: 409 });
  });

  it('does not let generic role replacement demote the singleton Owner', async () => {
    const service = new UserService();
    (service as any).userRepository = { findOne: jest.fn().mockResolvedValue({ userId: 1 }) };
    (service as any).roleRepository = { findOne: jest.fn().mockResolvedValue({ roleId: 2, roleName: 'Admin' }) };
    (AppDataSource as any).query = jest.fn().mockResolvedValue([{ userId: 1 }]);

    await expect(service.assignRoleToUser(1, 2, 1)).rejects.toMatchObject({ code: 'OWNER_TRANSFER_REQUIRED', statusCode: 409 });
  });
});
