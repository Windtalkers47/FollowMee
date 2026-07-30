import dataSource from '../../config/database';
import { Notification } from '../../entities/Notification';
import { NotificationRecipient } from '../../entities/NotificationRecipient';
import { User } from '../../entities/User';
import { NotificationService } from '../../services/notification.service';
import { webSocketService } from '../../services/websocket.service';
import { NotificationHelper, NotificationType } from '../../utils/notification.util';
import { taskDeadlineNotificationService } from '../../services/task-deadline-notification.service';
import { Task } from '../../entities/Task';

describe('Notification recipient integration', () => {
  let creatorId: number;
  let assigneeId: number;
  let reviewerId: number;
  let service: NotificationService;

  beforeAll(async () => {
    await dataSource.initialize();
    const users = dataSource.getRepository(User);
    creatorId = (await users.findOneByOrFail({ userEmail: 'qa-creator@example.test' })).userId;
    assigneeId = (await users.findOneByOrFail({ userEmail: 'qa-assignee@example.test' })).userId;
    reviewerId = (await users.findOneByOrFail({ userEmail: 'qa-reviewer@example.test' })).userId;
    service = new NotificationService(dataSource);
    NotificationHelper.initialize(service);

    jest.spyOn(webSocketService, 'emitNotificationToUser').mockImplementation(() => undefined);
    jest.spyOn(webSocketService, 'emitUnreadCount').mockImplementation(() => undefined);
    (service as any).sendPushNotifications = jest.fn().mockResolvedValue(undefined);
    (service as any).sendEmailNotifications = jest.fn().mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM notification_recipients');
    await dataSource.query('DELETE FROM notifications');
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('excludes the actor and adds missing recipients to a duplicate notification', async () => {
    const dto = {
      notificationType: 'TASK_UPDATED',
      actorUserId: creatorId,
      entityType: 'task',
      entityId: 'e2e-task-1',
      title: 'Task updated',
      message: 'A task changed',
      recipientUserIds: [creatorId, assigneeId],
    };

    const created = await service.createNotification(dto);
    await service.createNotification({ ...dto, recipientUserIds: [creatorId, assigneeId, reviewerId] });

    const recipients = await dataSource.getRepository(NotificationRecipient).find({
      where: { notificationId: created.notificationId },
    });
    expect(recipients.map((row) => row.userId).sort()).toEqual([assigneeId, reviewerId].sort());
    expect(recipients.some((row) => row.userId === creatorId)).toBe(false);
    expect(await dataSource.getRepository(Notification).count()).toBe(1);
  });

  it('keeps read, archive and restore filters consistent', async () => {
    const notification = await dataSource.getRepository(Notification).save({
      notificationType: 'TASK_ASSIGNED',
      title: 'Assigned',
      message: 'A task was assigned',
      entityType: 'task',
      entityId: 'e2e-task-2',
      actorUserId: creatorId,
    });
    const recipient = await dataSource.getRepository(NotificationRecipient).save({
      notificationId: notification.notificationId,
      userId: assigneeId,
    });

    await service.markAsRead(assigneeId, recipient.recipientId);
    expect(await service.getUnreadCount(assigneeId)).toBe(0);

    await service.archiveNotification(assigneeId, recipient.recipientId);
    expect((await service.getUserNotifications(assigneeId, 20, 0, 'active', false)).total).toBe(0);
    expect((await service.getUserNotifications(assigneeId, 20, 0, 'archived', false)).total).toBe(1);

    await service.restoreNotification(assigneeId, recipient.recipientId);
    expect((await service.getUserNotifications(assigneeId, 20, 0, 'active', false)).total).toBe(1);
  });

  it('isolates optional delivery failures from notification persistence', async () => {
    (service as any).sendPushNotifications.mockRejectedValueOnce(new Error('push unavailable'));
    (service as any).sendEmailNotifications.mockRejectedValueOnce(new Error('email unavailable'));

    const created = await service.createNotification({
      notificationType: NotificationType.TASK_ASSIGNED,
      actorUserId: creatorId,
      entityType: 'task',
      entityId: 'e2e-failure-isolation',
      title: 'Delivery isolation',
      message: 'The in-app notification must still be persisted.',
      recipientUserIds: [assigneeId],
    });

    expect(created.notificationId).toBeDefined();
    expect(await dataSource.getRepository(NotificationRecipient).count({
      where: { notificationId: created.notificationId },
    })).toBe(1);
  });

  it('sends a due-date notification at most once per task per day', async () => {
    const taskRepository = dataSource.getRepository(Task);
    const task = await taskRepository.findOneByOrFail({
      taskId: 'e2e00000-0000-4000-8000-000000000002',
    });
    task.dueDate = new Date(Date.now() + 60 * 60 * 1000);
    task.status = 'todo';
    await taskRepository.save(task);

    await taskDeadlineNotificationService.run();
    await taskDeadlineNotificationService.run();

    expect(await dataSource.getRepository(Notification).count({
      where: {
        notificationType: NotificationType.TASK_DEADLINE_NEAR,
        entityId: task.taskId,
      },
    })).toBe(1);
  });
});
