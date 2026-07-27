import { Between, In, MoreThanOrEqual } from 'typeorm';
import dataSource from '../config/database';
import { Task } from '../entities/Task';
import { Notification } from '../entities/Notification';
import { NotificationHelper, NotificationType } from '../utils/notification.util';

class TaskDeadlineNotificationService {
  private timer?: NodeJS.Timeout;

  async run(): Promise<void> {
    if (!dataSource.isInitialized) return;
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const tasks = await dataSource.getRepository(Task).find({
      where: {
        isActive: true,
        status: In(['todo', 'in_progress', 'review']),
        dueDate: Between(now, tomorrow),
      },
    });
    const notificationRepository = dataSource.getRepository(Notification);
    for (const task of tasks) {
      if (!task.assignedTo) continue;
      const alreadySent = await notificationRepository.findOne({
        where: {
          notificationType: NotificationType.TASK_DEADLINE_NEAR,
          entityType: 'task',
          entityId: task.taskId,
          createdAt: MoreThanOrEqual(dayStart),
        },
      });
      if (!alreadySent) {
        await NotificationHelper.notifyTaskDeadline(task.title, task.taskId, [task.assignedTo]);
      }
    }
  }

  start(): void {
    void this.run().catch(error => console.error('[TaskDeadline] Initial run failed:', error));
    this.timer = setInterval(
      () => void this.run().catch(error => console.error('[TaskDeadline] Scheduled run failed:', error)),
      60 * 60 * 1000
    );
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

export const taskDeadlineNotificationService = new TaskDeadlineNotificationService();
