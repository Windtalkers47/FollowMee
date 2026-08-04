import { Repository, In } from 'typeorm';
import { Task } from '../entities/Task';
import { TaskComment } from '../entities/TaskComment';
import { TaskRepository } from '../repositories/task.repository';
import { 
  CreateTaskDto, 
  UpdateTaskDto, 
  TaskQueryDto, 
  MarkTaskDoneDto,
  BulkUpdateStatusDto,
  BulkDeleteDto,
  BulkAssignDto,
  PrioritySummaryResponseDto,
  PrioritySuggestionDto,
  SuggestionActionDto
} from '../dtos/task.dto';
import { MyWorkResponseDto, TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';
import { User } from '../entities/User';
import { TaskImageService } from './task-image.service';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { NotificationHelper, NotificationType } from '../utils/notification.util';
import AppDataSource from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { addDays, isPast, isToday, isTomorrow } from 'date-fns';
import { webSocketService } from './websocket.service';
import { assertTaskTransition, getTaskWorkflowCapabilities, TaskStatus } from '../utils/task-workflow.util';
import { TaskActionError } from '../errors/task-transition.error';
import { createTaskFocusSummary } from '../utils/task-focus.util';
import { rewardService } from './reward.service';
import { TaskWatcher } from '../entities/TaskWatcher';
import { TaskActivity } from '../entities/TaskActivity';
import { taskAccessService } from './task-access.service';
import type { TaskScope } from '../types/organization.types';
import { TaskImage } from '../entities/TaskImage';

export interface TaskLeaderboardEntry {
  userId: number;
  userName: string;
  userLastName: string;
  completedTasks: number;
  score: number;
}

export class TaskService {
  private customTaskRepository: TaskRepository;
  private taskImageService: TaskImageService;
  private taskRepository: Repository<Task>;
  private watcherRepository = AppDataSource.getRepository(TaskWatcher);
  private activityRepository = AppDataSource.getRepository(TaskActivity);

  constructor(taskImageService?: TaskImageService) {
    this.customTaskRepository = new TaskRepository();
    this.taskImageService = taskImageService || new TaskImageService();
    this.taskRepository = AppDataSource.getRepository(Task);
  }

  private async recordActivity(taskId: string, actorUserId: number, action: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.activityRepository.save(this.activityRepository.create({ taskId, actorUserId, action, metadata: metadata || null }));
  }

  private async organizationAudience(): Promise<number[]> {
    const rows = await AppDataSource.getRepository(User).find({
      select: { userId: true },
      where: { isActive: true },
    });
    return rows.map(row => row.userId);
  }

  private async safelyNotify(operation: () => Promise<unknown>, context: Record<string, unknown>): Promise<void> {
    try {
      await operation();
    } catch (firstError) {
      try {
        await operation();
      } catch (retryError) {
        console.error('Task notification delivery failed', {
          ...context,
          error: retryError instanceof Error ? retryError.message : String(retryError),
          firstError: firstError instanceof Error ? firstError.message : String(firstError),
        });
      }
    }
  }

  private async safelyAwardTask(task: Task): Promise<void> {
    if (task.status !== 'done' || !task.assignedTo || !task.completedAt || task.completionScore <= 0) return;
    try {
      await rewardService.awardTaskCompletion({
        taskId: task.taskId,
        userId: task.assignedTo,
        score: task.completionScore,
        completedAt: new Date(task.completedAt),
        dueDate: task.dueDate,
        reopenedCount: task.reopenedCount || 0,
      });
    } catch (error) {
      console.error('Reward credit failed; idempotent reconciliation can retry it', {
        taskId: task.taskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async createTask(createTaskDto: CreateTaskDto, userId: number): Promise<TaskResponseDto> {
    if ((createTaskDto.images?.length || 0) > 6) {
      throw new Error('A task can contain at most 6 images');
    }
    const initialStatus = (createTaskDto.status || 'draft') as TaskStatus;
    if (!['draft', 'todo'].includes(initialStatus)) {
      const error = new Error('A new task can only be saved as draft or published as to do') as Error & { statusCode?: number; code?: string };
      error.statusCode = 400;
      error.code = 'INVALID_INITIAL_TASK_STATUS';
      throw error;
    }
    if (initialStatus === 'todo' && !createTaskDto.assignedTo) {
      const error = new Error('An assignee is required before publishing a task') as Error & { statusCode?: number; code?: string };
      error.statusCode = 400;
      error.code = 'TASK_ASSIGNEE_REQUIRED';
      throw error;
    }

    await taskAccessService.assertActiveUsers([createTaskDto.assignedTo || 0, ...(createTaskDto.watcherIds || [])]);
    const task = new Task();
    task.taskId = uuidv4();
    task.title = createTaskDto.title;
    task.description = createTaskDto.description;
    task.assignedTo = createTaskDto.assignedTo;
    task.createdBy = userId;
    task.priority = createTaskDto.priority || 'normal';
    task.dueDate = createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : undefined;
    task.startDate = createTaskDto.startDate ? new Date(createTaskDto.startDate) : undefined;
    task.endDate = createTaskDto.endDate ? new Date(createTaskDto.endDate) : undefined;
    task.status = initialStatus;
    task.isActive = true;
    task.completionScore = 0;
    task.reopenedCount = 0;

    const savedTask = await AppDataSource.transaction(async manager => {
      const saved = await manager.getRepository(Task).save(task);
      const watcherIds = [...new Set(createTaskDto.watcherIds || [])];
      if (watcherIds.length) await manager.getRepository(TaskWatcher).save(watcherIds.map(watcherId => manager.getRepository(TaskWatcher).create({ taskId: saved.taskId, userId: watcherId })));
      const imageInputs = createTaskDto.images?.length ? createTaskDto.images : createTaskDto.imageUrl ? [{ imageUrl: createTaskDto.imageUrl, imageOrder: 0 }] : [];
      if (imageInputs.length) await manager.getRepository(TaskImage).save(imageInputs.map((image, index) => manager.getRepository(TaskImage).create({ taskId: saved.taskId, imageUrl: image.imageUrl, imageOrder: image.imageOrder ?? index, uploadedBy: userId, isActive: true })));
      await manager.getRepository(TaskActivity).save(manager.getRepository(TaskActivity).create({ taskId: saved.taskId, actorUserId: userId, action: 'created', metadata: { priority: saved.priority, status: saved.status } }));
      return saved;
    });

    // Draft assignment is private planning data until the creator publishes it.
    if (savedTask.status !== 'draft' && savedTask.assignedTo && savedTask.assignedTo !== userId) {
      const recipientId = savedTask.assignedTo;
      await this.safelyNotify(() => NotificationHelper.notifyTaskAssigned(
        savedTask.title,
        `/tasks/${savedTask.taskId}`,
        userId,
        [recipientId]
      ), { taskId: savedTask.taskId, action: 'create-assignment', recipientId });
    }

    // Fetch the user data separately to avoid relation issues
    const createdByUser = await AppDataSource.getRepository(User).findOne({
      where: { userId: savedTask.createdBy },
      select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail'] as any
    });
    
    let assignedToUser: User | null = null;
    if (savedTask.assignedTo) {
      assignedToUser = await AppDataSource.getRepository(User).findOne({
        where: { userId: savedTask.assignedTo },
        select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail'] as any
      });
    }
    
    if (!createdByUser) {
      throw new Error('Failed to retrieve user who created the task');
    }
    
    // Create a task object with the user relations
    const taskWithRelations = {
      ...savedTask,
      createdByUser,
      assignedToUser
    };
    
    const response = await this.mapToResponseDto(taskWithRelations as any, userId);
    const createdWatcherIds = (createTaskDto.watcherIds || []).filter(id => id !== userId && id !== savedTask.assignedTo);
    if (savedTask.status !== 'draft' && createdWatcherIds.length) {
      await this.safelyNotify(() => NotificationHelper.notifyTaskUpdated(
        savedTask.title,
        savedTask.taskId,
        userId,
        createdWatcherIds,
      ), { taskId: savedTask.taskId, action: 'watching-created' });
    }
    webSocketService.emitDomainEvent('task:created', {
      taskId: savedTask.taskId,
      actorUserId: userId,
      assignedTo: savedTask.assignedTo,
      status: savedTask.status,
      updatedAt: savedTask.updatedAt,
    }, savedTask.status === 'draft' ? [savedTask.createdBy] : await this.organizationAudience());
    return response;
  }

  async getTasks(query: TaskQueryDto, viewerUserId?: number): Promise<TaskListResponseDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const normalizedQuery = { ...query, page, limit };
    const access = viewerUserId ? await taskAccessService.context(viewerUserId) : undefined;
    const [tasks, total] = await this.customTaskRepository.findTasksWithRelations(normalizedQuery, access);
    const totalPages = Math.ceil(total / limit);

    const response: TaskListResponseDto = {
      tasks: await Promise.all(tasks.map(task => this.mapToResponseDto(task, viewerUserId))),
      total,
      page,
      limit,
      totalPages
    };

    // Add performance statistics if requested
    if (query.includeStats && tasks.length > 0) {
      response.topPerformers = this.calculateTopPerformers(tasks);
    }
    if (query.includeFocus === true || String(query.includeFocus) === 'true') {
      const meta = await this.customTaskRepository.getScheduleMeta(access);
      response.statusCounts = meta.statusCounts;
      response.focus = meta.focus;
    }

    return response;
  }

  private calculateTopPerformers(tasks: Task[]): Array<{userId: number, userName: string, userLastName: string, completedTasks: number}> {
    const userTaskCounts = tasks.reduce((acc, task) => {
      if (task.status === 'done' && task.assignedTo) {
        const userId = task.assignedTo;
        acc[userId] = (acc[userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const userDetails = tasks.reduce((acc, task) => {
      if (task.assignedTo && task.assignedToUser && !acc[task.assignedTo]) {
        acc[task.assignedTo] = {
          userId: task.assignedTo,
          userName: task.assignedToUser.userName || 'Unknown',
          userLastName: task.assignedToUser.userLastName || ''
        };
      }
      return acc;
    }, {} as Record<number, {userId: number, userName: string, userLastName: string}>);

    return Object.entries(userTaskCounts)
      .map(([userId, count]) => {
        const user = userDetails[parseInt(userId)];
        return {
          userId: parseInt(userId),
          userName: user?.userName || 'Unknown',
          userLastName: user?.userLastName || 'User',
          completedTasks: count
        };
      })
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 5);
  }

  async getTaskById(taskId: string, viewerUserId: number): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findWithStats(taskId);

    if (!task) {
      throw new Error('Task not found');
    }
    if (task.status === 'draft' && task.createdBy !== viewerUserId) {
      throw new TaskActionError('Draft tasks are only visible to their creator', 'view_draft', 403, task.status as TaskStatus);
    }
    const access = await taskAccessService.context(viewerUserId);
    taskAccessService.assertView(task, access);
    return this.mapToResponseDto(task, viewerUserId);
  }

  async getTaskActivities(taskId: string, viewerUserId: number, limit = 50) {
    const task = await this.customTaskRepository.findById(taskId);
    if (!task) throw Object.assign(new Error('Task not found'), { statusCode: 404 });
    taskAccessService.assertView(task, await taskAccessService.context(viewerUserId));
    return this.activityRepository.find({
      where: { taskId }, relations: ['actor'], order: { createdAt: 'DESC' }, take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async managerReassign(taskId: string, assignedTo: number | undefined, userId: number, expectedVersion?: number) {
    return this.updateTask(taskId, { assignedTo, expectedVersion }, userId);
  }

  async managerCancel(taskId: string, userId: number, expectedVersion?: number) {
    return this.updateTask(taskId, { status: 'cancelled', expectedVersion }, userId);
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, userId: number): Promise<TaskResponseDto> {
    if ((updateTaskDto.images?.length || 0) > 6) {
      throw new Error('A task can contain at most 6 images');
    }
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }
    const previousStatus = task.status;
    const previousAssignedTo = task.assignedTo;
    const access = await taskAccessService.context(userId);
    taskAccessService.assertView(task, access);
    const canManage = taskAccessService.canManage(task, access);
    if (updateTaskDto.expectedVersion !== undefined && updateTaskDto.expectedVersion !== task.version) {
      throw Object.assign(new Error('This task was changed by another user. Reload it before saving.'), { statusCode: 409, code: 'TASK_VERSION_CONFLICT', currentVersion: task.version });
    }

    const mutationKeys = Object.keys(updateTaskDto).filter(key => key !== 'expectedVersion');
    const isStatusOnlyUpdate = mutationKeys.length === 1 && updateTaskDto.status !== undefined;
    
    // Metadata and assignment belong to the creator. Assignees only move their work through action endpoints.
    if (!isStatusOnlyUpdate && !canManage) {
      throw new TaskActionError('Only the task creator can edit task details or assignment', 'edit_metadata', 403, task.status as TaskStatus);
    }
    
    if (isStatusOnlyUpdate && !canManage && task.assignedTo !== userId) {
      throw new Error('You can only update task status if you are the creator or assigned user');
    }

    if (updateTaskDto.title !== undefined) task.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) task.description = updateTaskDto.description;
    if (updateTaskDto.assignedTo !== undefined) {
      task.assignedTo = updateTaskDto.assignedTo;
    }
    if (updateTaskDto.priority !== undefined) task.priority = updateTaskDto.priority;
    const watcherIdsToValidate = updateTaskDto.watcherIds ?? (await this.watcherRepository.find({ where: { taskId } })).map(watcher => watcher.userId);
    await taskAccessService.assertActiveUsers([task.assignedTo || 0, ...watcherIdsToValidate]);
    if (updateTaskDto.dueDate !== undefined) {
      task.dueDate = updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : undefined;
    }
    if (updateTaskDto.startDate !== undefined) {
      task.startDate = updateTaskDto.startDate ? new Date(updateTaskDto.startDate) : undefined;
    }
    if (updateTaskDto.endDate !== undefined) {
      task.endDate = updateTaskDto.endDate ? new Date(updateTaskDto.endDate) : undefined;
    }
    if (updateTaskDto.status !== undefined) {
      if (task.status === 'review' && updateTaskDto.status === 'todo') {
        throw new TaskActionError(
          'Use request changes with a reason to return a review task to to do',
          'request_changes',
          409,
          task.status as TaskStatus,
        );
      }
      if (task.status === 'draft' && updateTaskDto.status === 'todo' && !task.assignedTo) {
        const error = new Error('An assignee is required before publishing a task') as Error & { statusCode?: number; code?: string };
        error.statusCode = 400;
        error.code = 'TASK_ASSIGNEE_REQUIRED';
        throw error;
      }
      assertTaskTransition(task, updateTaskDto.status as TaskStatus, userId, canManage);
      if (updateTaskDto.status === 'done') {
        const completedAt = new Date();
        const onTimeBonus = task.dueDate && completedAt <= new Date(task.dueDate) ? 3 : 0;
        const reopenPenalty = Math.min((task.reopenedCount || 0) * 2, 6);
        task.status = 'done';
        task.completedAt = completedAt;
        task.completionScore = Math.max(4, 10 + onTimeBonus - reopenPenalty);
      } else {
        task.status = updateTaskDto.status;
      }
    }
    if (updateTaskDto.isActive !== undefined) task.isActive = updateTaskDto.isActive;

    task.updatedAt = new Date();

    const savedTask = await AppDataSource.transaction(async manager => {
      const saved = await manager.getRepository(Task).save(task);
      if (updateTaskDto.watcherIds !== undefined) {
        await manager.getRepository(TaskWatcher).delete({ taskId });
        const unique = [...new Set(updateTaskDto.watcherIds)];
        if (unique.length) await manager.getRepository(TaskWatcher).save(unique.map(watcherId => manager.getRepository(TaskWatcher).create({ taskId, userId: watcherId })));
      }
      const imageInputs = updateTaskDto.images !== undefined ? updateTaskDto.images : updateTaskDto.imageUrl !== undefined ? (updateTaskDto.imageUrl ? [{ imageUrl: updateTaskDto.imageUrl, imageOrder: 0 }] : []) : undefined;
      if (imageInputs !== undefined) {
        await manager.getRepository(TaskImage).update({ taskId, isActive: true }, { isActive: false, deletedAt: new Date() });
        if (imageInputs.length) await manager.getRepository(TaskImage).save(imageInputs.map((image, index) => manager.getRepository(TaskImage).create({ taskId, imageUrl: image.imageUrl, imageOrder: image.imageOrder ?? index, uploadedBy: userId, isActive: true })));
      }
      await manager.getRepository(TaskActivity).save(manager.getRepository(TaskActivity).create({ taskId, actorUserId: userId, action: 'updated', metadata: { previousStatus, status: saved.status, previousAssignedTo, assignedTo: saved.assignedTo, ownerOverride: access.isOwner && saved.createdBy !== userId } }));
      return saved;
    });
    const savedWatcherIds = (await this.watcherRepository.find({ where: { taskId } })).map(watcher => watcher.userId);
    const relatedRecipients = [...new Set([savedTask.createdBy, savedTask.assignedTo, ...savedWatcherIds])]
      .filter((id): id is number => Boolean(id) && id !== userId);
    const assignmentChanged = updateTaskDto.assignedTo !== undefined
      && updateTaskDto.assignedTo !== previousAssignedTo;
    const becamePublished = previousStatus === 'draft' && savedTask.status === 'todo';
    if (
      savedTask.status !== 'draft'
      && savedTask.assignedTo
      && savedTask.assignedTo !== userId
      && (assignmentChanged || becamePublished)
    ) {
      await this.safelyNotify(() => NotificationHelper.notifyTaskAssigned(
        savedTask.title,
        `/tasks/${savedTask.taskId}`,
        userId,
        [savedTask.assignedTo!],
      ), { taskId: savedTask.taskId, action: becamePublished ? 'publish' : 'reassign', recipientId: savedTask.assignedTo });
    }
    if (savedTask.status !== 'draft' && updateTaskDto.status && updateTaskDto.status !== previousStatus) {
      const requestedStatus = updateTaskDto.status;
      await this.safelyNotify(() => NotificationHelper.notifyTaskStatus(
        requestedStatus === 'done'
          ? NotificationType.TASK_COMPLETED
          : NotificationType.TASK_UPDATED,
        requestedStatus === 'done' ? 'Task approved' : 'Task status changed',
        `Status changed from ${previousStatus.replace('_', ' ')} to ${requestedStatus.replace('_', ' ')}`,
        savedTask.title,
        savedTask.taskId,
        userId,
        relatedRecipients
      ), { taskId: savedTask.taskId, action: 'status-change', status: savedTask.status });
    } else if (savedTask.status !== 'draft' && !assignmentChanged && Object.keys(updateTaskDto).length > 0) {
      await this.safelyNotify(() => NotificationHelper.notifyTaskUpdated(
        savedTask.title,
        savedTask.taskId,
        userId,
        relatedRecipients
      ), { taskId: savedTask.taskId, action: 'metadata-update' });
    }
    const response = await this.mapToResponseDto(savedTask, userId);
    webSocketService.emitDomainEvent('task:updated', {
      taskId: savedTask.taskId,
      actorUserId: userId,
      assignedTo: savedTask.assignedTo,
      status: savedTask.status,
      updatedAt: savedTask.updatedAt,
    }, savedTask.status === 'draft' ? [savedTask.createdBy] : await this.organizationAudience());
    if (savedTask.status === 'done' && previousStatus !== 'done') {
      webSocketService.emitDomainEvent('activity:created', { taskId: savedTask.taskId, status: savedTask.status, updatedAt: savedTask.updatedAt }, await this.organizationAudience());
    }
    return response;
  }

  async deleteTask(taskId: string, userId: number): Promise<void> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const access = await taskAccessService.context(userId);
    taskAccessService.assertManage(task, access);
    if (!taskAccessService.canManage(task, access)) {
      throw new TaskActionError('Only the task creator can delete this task', 'delete', 403, task.status as TaskStatus);
    }

    // Commit the resource state before performing external Cloudinary side effects.
    const images = await this.taskImageService.getTaskImages(taskId);
    task.isActive = false;
    task.deletedAt = new Date();
    await this.taskRepository.save(task);
    await this.recordActivity(task.taskId, userId, 'deleted', { ownerOverride: access.isOwner && task.createdBy !== userId });
    webSocketService.emitDomainEvent('task:deleted', { taskId, actorUserId: userId, updatedAt: task.updatedAt }, task.status === 'draft' ? [task.createdBy] : await this.organizationAudience());
    for (const image of images) {
      if (!image.imageUrl) continue;
      try {
        await CloudinaryUtil.deleteImage(image.imageUrl);
      } catch (error) {
        console.error('Failed to delete image from Cloudinary after task deletion:', error);
      }
    }
  }

  async getUserTasks(userId: number, includeAssigned: boolean = true): Promise<TaskResponseDto[]> {
    const tasks = await this.customTaskRepository.findTasksByAssignedUser(userId);
    return await Promise.all(tasks
      .filter((task) => task.status !== 'draft' || task.createdBy === userId)
      .map(task => this.mapToResponseDto(task, userId)));
  }

  async getMyWork(userId: number, limit = 20, cursor?: string): Promise<MyWorkResponseDto> {
    const result = await this.customTaskRepository.findMyWork(userId, limit, cursor);
    const items = await Promise.all(result.tasks.map(async (task) => {
      const mapped = await this.mapToResponseDto(task, userId);
      mapped.attentionReason = task.status === 'review' && task.createdBy === userId
        ? 'approval_required'
        : 'assigned';
      return mapped;
    }));
    const last = result.tasks[result.tasks.length - 1];
    const count = (key: string) => Number(result.counts[key]) || 0;
    return {
      items,
      counts: {
        todo: count('todo'),
        inProgress: count('in_progress'),
        review: count('review'),
        approvalRequired: count('approvalRequired'),
        overdue: count('overdue'),
        dueToday: count('dueToday'),
        dueSoon: count('dueSoon'),
      },
      focus: createTaskFocusSummary({
        approvalRequired: count('approvalRequired'),
        overdue: count('overdue'),
        dueToday: count('dueToday'),
        dueSoon: count('dueSoon'),
      }, String(result.counts.latestUpdate || 'empty'), 'personal'),
      pageInfo: {
        nextCursor: last
          ? Buffer.from(`${last.updatedAt.toISOString()}|${last.taskId}`).toString('base64url')
          : undefined,
      },
    };
  }

  async updateTaskStatuses(): Promise<void> {
    const now = new Date();

    // Update overdue tasks to 'past'
    const overdueTasks = await this.customTaskRepository.getOverdueTasks();
    for (const task of overdueTasks) {
      await this.customTaskRepository.updateTaskStatus(task.taskId, 'cancelled');
    }
  }

  async getTopPerformers(limit: number = 5): Promise<TaskLeaderboardEntry[]> {
    const rows = await this.getLeaderboardRows();
    return rows
      .filter(row => row.completedTasks > 0)
      .slice(0, Math.max(1, Math.min(limit, 100)));
  }

  async markTaskAsDone(taskId: string, userId: number, markTaskDoneDto?: MarkTaskDoneDto): Promise<TaskResponseDto> {
    return this.submitTaskForReview(taskId, userId);
  }

  async submitTaskForReview(taskId: string, userId: number): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }
    taskAccessService.assertView(task, await taskAccessService.context(userId));

    if (task.assignedTo !== userId) {
      throw new TaskActionError('Only the task assignee can submit this task', 'submit_review', 403, task.status as TaskStatus);
    }

    if (task.status !== 'in_progress') {
      throw new TaskActionError('Only a task in progress can be submitted for review', 'submit_review', 409, task.status as TaskStatus);
    }

    await this.customTaskRepository.updateTaskStatus(taskId, 'review');
    await this.recordActivity(taskId, userId, 'submitted_for_review');
    await this.safelyNotify(() => NotificationHelper.notifyTaskStatus(
      NotificationType.TASK_UPDATED,
      'Task ready for review',
      'Work was submitted for review',
      task.title,
      task.taskId,
      userId,
      [task.createdBy]
    ), { taskId, action: 'submit-review', recipientId: task.createdBy });
    const updatedTask = await this.customTaskRepository.findWithStats(taskId);
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task');
    }

    webSocketService.emitDomainEvent('task:updated', {
      taskId,
      actorUserId: userId,
      assignedTo: updatedTask.assignedTo,
      status: 'review',
      updatedAt: updatedTask.updatedAt,
    }, [updatedTask.createdBy, updatedTask.assignedTo, userId].filter((id): id is number => Boolean(id)));

    return this.mapToResponseDto(updatedTask, userId);
  }

  async markTaskAsUndone(taskId: string, userId: number): Promise<TaskResponseDto> {
    return this.requestTaskChanges(taskId, userId, 'Changes requested');
  }

  async requestTaskChanges(taskId: string, userId: number, reason: string): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      const error = new Error('A reason is required when requesting changes') as Error & { statusCode?: number; code?: string };
      error.statusCode = 400;
      error.code = 'INVALID_REQUEST_CHANGES_REASON';
      throw error;
    }

    const access = await taskAccessService.context(userId);
    if (!taskAccessService.canManage(task, access)) {
      throw new TaskActionError('Only the task creator can request changes', 'request_changes', 403, task.status as TaskStatus);
    }

    if (task.status !== 'review') {
      throw new TaskActionError('Only a task in review can be returned for changes', 'request_changes', 409, task.status as TaskStatus);
    }

    await AppDataSource.transaction(async (manager) => {
      task.status = 'todo';
      task.completedAt = undefined;
      task.completionScore = 0;
      task.reopenedCount = (task.reopenedCount || 0) + 1;
      task.updatedAt = new Date();
      await manager.getRepository(Task).save(task);
      await manager.getRepository(TaskComment).save(manager.getRepository(TaskComment).create({
        taskId,
        userId,
        comment: trimmedReason,
        isActive: true,
      }));
    });
    await this.recordActivity(taskId, userId, 'changes_requested', { reason: trimmedReason, ownerOverride: access.isOwner && task.createdBy !== userId });
    await this.safelyNotify(() => NotificationHelper.notifyTaskStatus(
      NotificationType.TASK_UPDATED,
      'Task needs changes',
      trimmedReason,
      task.title,
      task.taskId,
      userId,
      task.assignedTo ? [task.assignedTo] : []
    ), { taskId, action: 'request-changes', recipientId: task.assignedTo });
    const updatedTask = await this.customTaskRepository.findWithStats(taskId);
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task');
    }

    webSocketService.emitDomainEvent('task:updated', {
      taskId,
      actorUserId: userId,
      assignedTo: updatedTask.assignedTo,
      status: 'todo',
      updatedAt: updatedTask.updatedAt,
    }, [updatedTask.createdBy, updatedTask.assignedTo, userId].filter((id): id is number => Boolean(id)));

    return this.mapToResponseDto(updatedTask, userId);
  }

  async approveTask(taskId: string, userId: number): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const access = await taskAccessService.context(userId);
    if (!taskAccessService.canManage(task, access)) {
      throw new TaskActionError('Only the task creator can approve this task', 'approve', 403, task.status as TaskStatus);
    }

    if (task.status !== 'review') {
      throw new TaskActionError('Only a task in review can be approved', 'approve', 409, task.status as TaskStatus);
    }

    const completedAt = new Date();
    const onTimeBonus = task.dueDate && completedAt <= new Date(task.dueDate) ? 3 : 0;
    const reopenPenalty = Math.min((task.reopenedCount || 0) * 2, 6);
    task.status = 'done';
    task.completedAt = completedAt;
    task.completionScore = Math.max(4, 10 + onTimeBonus - reopenPenalty);
    await this.taskRepository.save(task);
    await this.recordActivity(taskId, userId, 'approved', { score: task.completionScore, ownerOverride: access.isOwner && task.createdBy !== userId });
    await this.safelyAwardTask(task);
    await this.safelyNotify(() => NotificationHelper.notifyTaskStatus(
      NotificationType.TASK_COMPLETED,
      'Task approved',
      'Your completed work was approved',
      task.title,
      task.taskId,
      userId,
      task.assignedTo ? [task.assignedTo] : []
    ), { taskId, action: 'approve', recipientId: task.assignedTo });
    const updatedTask = await this.customTaskRepository.findWithStats(taskId);
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task');
    }

    webSocketService.emitDomainEvent('task:updated', {
      taskId,
      actorUserId: userId,
      assignedTo: updatedTask.assignedTo,
      status: 'done',
      updatedAt: updatedTask.updatedAt,
    }, [updatedTask.createdBy, updatedTask.assignedTo, userId].filter((id): id is number => Boolean(id)));
    webSocketService.emitDomainEvent('activity:created', {
      taskId,
      status: 'done',
      updatedAt: updatedTask.updatedAt,
    }, await this.organizationAudience());

    return this.mapToResponseDto(updatedTask, userId);
  }

  async getUserRank(userId: number): Promise<{ rank: number; completedTasks: number; totalUsers: number; score: number }> {
    const rows = await this.getLeaderboardRows();
    const index = rows.findIndex(row => row.userId === userId);
    const activeUsers = await AppDataSource.getRepository(User).count({ where: { isActive: true } });

    if (index < 0) {
      return {
        rank: rows.length + 1,
        completedTasks: 0,
        totalUsers: Math.max(activeUsers, rows.length + 1),
        score: 0
      };
    }

    return {
      rank: index + 1,
      completedTasks: rows[index].completedTasks,
      totalUsers: Math.max(activeUsers, rows.length),
      score: rows[index].score
    };
  }

  private async getLeaderboardRows(): Promise<TaskLeaderboardEntry[]> {
    const rows = await AppDataSource.getRepository(User)
      .createQueryBuilder('user')
      .leftJoin(
        Task,
        'task',
        'task.assignedTo = user.userId AND task.status = :status AND task.isActive = :taskActive',
        { status: 'done', taskActive: true }
      )
      .select('user.userId', 'userId')
      .addSelect('user.userName', 'userName')
      .addSelect('user.userLastName', 'userLastName')
      .addSelect('COUNT(task.taskId)', 'completedTasks')
      .addSelect('COALESCE(SUM(task.completionScore), 0)', 'score')
      .where('user.isActive = :active', { active: true })
      .groupBy('user.userId')
      .addGroupBy('user.userName')
      .addGroupBy('user.userLastName')
      .orderBy('score', 'DESC')
      .addOrderBy('completedTasks', 'DESC')
      .addOrderBy('user.userId', 'ASC')
      .getRawMany();

    return rows.map(row => ({
      userId: Number(row.userId),
      userName: row.userName || 'Unknown',
      userLastName: row.userLastName || '',
      completedTasks: Number(row.completedTasks) || 0,
      score: Number(row.score) || 0
    }));
  }

  // ==================== Bulk Actions ====================

  /**
   * Update status of multiple tasks at once
   */
  async bulkUpdateStatus(
    taskIds: string[], 
    status: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled',
    userId: number
  ): Promise<{ updated: number; failed: Array<{ taskId: string; reason: string; code?: string }> }> {
    const failed: Array<{ taskId: string; reason: string; code?: string }> = [];
    let updated = 0;
    const affectedUsers = new Set<number>([userId]);

    for (const taskId of taskIds) {
      try {
        const task = await this.customTaskRepository.findById(taskId);
        if (!task) {
          failed.push({ taskId, reason: 'Task not found', code: 'TASK_NOT_FOUND' });
          continue;
        }
        affectedUsers.add(task.createdBy);
        if (task.assignedTo) affectedUsers.add(task.assignedTo);

        const access = await taskAccessService.context(userId);
        if (!taskAccessService.canManage(task, access)) {
          failed.push({ taskId, reason: 'You do not have permission to update this task', code: 'TASK_UPDATE_FORBIDDEN' });
          continue;
        }

        if (status === 'done') {
          if (task.status !== 'review') {
            failed.push({ taskId, reason: `Invalid task transition from ${task.status} to done`, code: 'INVALID_TASK_TRANSITION' });
            continue;
          }
          if (!taskAccessService.canManage(task, access)) {
            failed.push({ taskId, reason: 'Only the task creator can approve a task in review', code: 'TASK_APPROVAL_FORBIDDEN' });
            continue;
          }
          const completedAt = new Date();
          const onTimeBonus = task.dueDate && completedAt <= new Date(task.dueDate) ? 3 : 0;
          const reopenPenalty = Math.min((task.reopenedCount || 0) * 2, 6);
          task.status = 'done';
          task.completedAt = completedAt;
          task.completionScore = Math.max(4, 10 + onTimeBonus - reopenPenalty);
          await this.taskRepository.save(task);
          await this.safelyAwardTask(task);
        } else {
          if (task.status === 'review' && status === 'todo') {
            failed.push({
              taskId,
              reason: 'Use request changes with a reason to return a review task to to do',
              code: 'INVALID_TASK_ACTION',
            });
            continue;
          }
          if (task.status === 'draft' && status === 'todo' && !task.assignedTo) {
            failed.push({ taskId, reason: 'An assignee is required before publishing a task', code: 'TASK_ASSIGNEE_REQUIRED' });
            continue;
          }
          if (task.status === status) {
            updated++;
            continue;
          }
          assertTaskTransition(task, status as TaskStatus, userId, taskAccessService.canManage(task, access));
          await this.customTaskRepository.updateTaskStatus(taskId, status);
          if (task.status === 'draft' && status === 'todo' && task.assignedTo && task.assignedTo !== userId) {
            const recipientId = task.assignedTo;
            await this.safelyNotify(() => NotificationHelper.notifyTaskAssigned(
              task.title,
              `/tasks/${task.taskId}`,
              userId,
              [recipientId],
            ), { taskId: task.taskId, action: 'bulk-publish', recipientId });
          }
        }
        updated++;
      } catch (error) {
        failed.push({ taskId, reason: error instanceof Error ? error.message : 'Task update failed', code: (error as any)?.code });
      }
    }

    if (updated > 0) {
      webSocketService.emitDomainEvent('task:updated', { taskIds, actorUserId: userId, status, updatedAt: new Date() }, [...affectedUsers]);
      if (status === 'done') {
        webSocketService.broadcast('activity:created', { taskIds, status, updatedAt: new Date() });
      }
    }
    return { updated, failed };
  }

  /**
   * Delete multiple tasks at once (soft delete)
   */
  async bulkDelete(taskIds: string[], userId: number): Promise<{ deleted: number; failed: string[] }> {
    const failed: string[] = [];
    let deleted = 0;
    const affectedUsers = new Set<number>([userId]);

    for (const taskId of taskIds) {
      try {
        const task = await this.customTaskRepository.findById(taskId);
        if (!task) {
          failed.push(taskId);
          continue;
        }
        affectedUsers.add(task.createdBy);
        if (task.assignedTo) affectedUsers.add(task.assignedTo);

        const access = await taskAccessService.context(userId);
        if (!taskAccessService.canManage(task, access)) {
          failed.push(taskId);
          continue;
        }

        // Soft delete by marking as inactive
        task.isActive = false;
        task.deletedAt = new Date();
        await this.taskRepository.save(task);
        await this.recordActivity(taskId, userId, 'deleted', { bulk: true, ownerOverride: access.isOwner && task.createdBy !== userId });
        deleted++;
      } catch (error) {
        failed.push(taskId);
      }
    }

    if (deleted > 0) {
      webSocketService.emitDomainEvent('task:deleted', { taskIds, actorUserId: userId, updatedAt: new Date() }, [...affectedUsers]);
    }
    return { deleted, failed };
  }

  /**
   * Assign multiple tasks to a user at once
   */
  async bulkAssign(taskIds: string[], assignedTo: number | undefined, userId: number): Promise<{ assigned: number; failed: string[] }> {
    const failed: string[] = [];
    let assigned = 0;
    const affectedUsers = new Set<number>([userId]);

    for (const taskId of taskIds) {
      try {
        const task = await this.customTaskRepository.findById(taskId);
        if (!task) {
          failed.push(taskId);
          continue;
        }
        affectedUsers.add(task.createdBy);
        if (task.assignedTo) affectedUsers.add(task.assignedTo);
        if (assignedTo) affectedUsers.add(assignedTo);

        const access = await taskAccessService.context(userId);
        if (!taskAccessService.canManage(task, access)) {
          failed.push(taskId);
          continue;
        }

        const oldAssignedTo = task.assignedTo;
        await taskAccessService.assertActiveUsers(assignedTo ? [assignedTo] : []);
        task.assignedTo = assignedTo;

        // Draft assignment remains private until the task is published.
        if (task.status !== 'draft' && assignedTo && assignedTo !== oldAssignedTo && assignedTo !== userId) {
          await this.safelyNotify(() => NotificationHelper.notifyTaskAssigned(
            task.title,
            `/tasks/${task.taskId}`,
            userId,
            [assignedTo]
          ), { taskId: task.taskId, action: 'bulk-reassign', recipientId: assignedTo });
        }

        await this.taskRepository.save(task);
        assigned++;
      } catch (error) {
        failed.push(taskId);
      }
    }

    if (assigned > 0) {
      webSocketService.emitDomainEvent('task:updated', {
        taskIds,
        actorUserId: userId,
        assignedTo,
        updatedAt: new Date(),
      }, [...affectedUsers]);
    }
    return { assigned, failed };
  }

  /**
   * Get priority summary with smart suggestions based on due dates
   */
  async getPrioritySummary(userId: number): Promise<PrioritySummaryResponseDto> {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    const threeDaysLater = addDays(now, 3);

    // Get all active tasks for this user
    const access = await taskAccessService.context(userId);
    const [allTasks] = await this.customTaskRepository.findTasksWithRelations({
      assignedTo: userId,
      page: 1,
      limit: 1000
    }, access);

    const activeTasks = allTasks.filter(task => task.isActive && ['todo', 'in_progress', 'review'].includes(task.status));

    // Categorize tasks by urgency
    const dueToday: Task[] = [];
    const dueTomorrow: Task[] = [];
    const overdue: Task[] = [];
    const dueWithin3Days: Task[] = [];

    for (const task of activeTasks) {
      const dueDate = task.endDate ? new Date(task.endDate) : (task.dueDate ? new Date(task.dueDate) : null);
      if (!dueDate) continue;

      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task);
      } else if (isToday(dueDate)) {
        dueToday.push(task);
      } else if (isTomorrow(dueDate)) {
        dueTomorrow.push(task);
      } else if (dueDate <= threeDaysLater) {
        dueWithin3Days.push(task);
      }
    }

    // Build suggestions
    const suggestions: PrioritySuggestionDto[] = [];

    // Overdue tasks (highest priority)
    if (overdue.length > 0) {
      suggestions.push({
        id: 'overdue',
        translationKey: 'overdue',
        title: 'งานที่เกินกำหนด',
        type: 'overdue',
        taskIds: overdue.map(t => t.taskId),
        count: overdue.length,
        priority: 100,
        message: `คุณมี ${overdue.length} งานที่เกินกำหนด - ควรจัดการด่วน!`,
        actions: [
          { id: 'start-all', label: 'เริ่มทำทั้งหมด', type: 'start-all', color: '#FF3B30' },
          { id: 'reschedule', label: 'เลื่อนกำหนด', type: 'reschedule', color: '#FF9500' }
        ]
      });
    }

    // Due today
    if (dueToday.length > 0) {
      suggestions.push({
        id: 'due-today',
        translationKey: 'today',
        title: 'งานครบกำหนดวันนี้',
        type: 'due-today',
        taskIds: dueToday.map(t => t.taskId),
        count: dueToday.length,
        priority: 90,
        message: `คุณมี ${dueToday.length} งานที่ต้องเสร็จวันนี้ - สู้ๆ!`,
        actions: [
          { id: 'mark-done', label: 'ทำเสร็จแล้วทั้งหมด', type: 'mark-done', color: '#34C759' },
          { id: 'start-all', label: 'เริ่มทำทั้งหมด', type: 'start-all', color: '#0A84FF' }
        ]
      });
    }

    // Due tomorrow
    if (dueTomorrow.length > 0) {
      suggestions.push({
        id: 'due-tomorrow',
        translationKey: 'tomorrow',
        title: 'งานครบกำหนดพรุ่งนี้',
        type: 'due-tomorrow',
        taskIds: dueTomorrow.map(t => t.taskId),
        count: dueTomorrow.length,
        priority: 70,
        message: `คุณมี ${dueTomorrow.length} งานที่ต้องเสร็จพรุ่งนี้ - เตรียมตัวไว้ก่อน!`,
        actions: [
          { id: 'start-all', label: 'เริ่มทำทั้งหมด', type: 'start-all', color: '#0A84FF' },
          { id: 'review', label: 'ตรวจสอบ', type: 'review', color: '#AF52DE' }
        ]
      });
    }

    // Due within 3 days
    if (dueWithin3Days.length > 0) {
      suggestions.push({
        id: 'due-within-3-days',
        translationKey: 'soon',
        title: 'งานครบกำหนดใน 3 วัน',
        type: 'due-within-3-days',
        taskIds: dueWithin3Days.map(t => t.taskId),
        count: dueWithin3Days.length,
        priority: 50,
        message: `คุณมี ${dueWithin3Days.length} งานที่ต้องเสร็จใน 3 วัน - วางแผนให้ดี!`,
        actions: [
          { id: 'review', label: 'ตรวจสอบ', type: 'review', color: '#AF52DE' }
        ]
      });
    }

    // Sort by priority (highest first)
    suggestions.sort((a, b) => b.priority - a.priority);

    // Determine suggested action
    let suggestedAction: string | undefined;
    if (overdue.length > 0) {
      suggestedAction = 'handle-overdue';
    } else if (dueToday.length > 0) {
      suggestedAction = 'complete-today';
    } else if (dueTomorrow.length > 0) {
      suggestedAction = 'prepare-tomorrow';
    }

    return {
      dueToday: dueToday.length,
      dueTomorrow: dueTomorrow.length,
      overdue: overdue.length,
      dueWithin3Days: dueWithin3Days.length,
      totalTasks: activeTasks.length,
      suggestedAction,
      suggestions
    };
  }

  private async mapToResponseDto(task: Task, viewerUserId?: number): Promise<TaskResponseDto> {
    // Get task images
    const images = await this.taskImageService.getTaskImages(task.taskId);
    const imageUrl = images && images.length > 0 ? images[0].imageUrl : undefined;

    const access = viewerUserId ? await taskAccessService.context(viewerUserId) : undefined;
    const canOwnerOverride = Boolean(access?.isOwner && task.createdBy !== viewerUserId);
    const workflow = getTaskWorkflowCapabilities(task, viewerUserId, canOwnerOverride);
    const watcherIds = (await this.watcherRepository.find({ where: { taskId: task.taskId } })).map(watcher => watcher.userId);
    const scope: TaskScope = task.status === 'draft' ? 'private_draft' : 'organization';

    const response: TaskResponseDto = {
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
      priority: task.priority,
      version: task.version,
      watcherIds,
      scope,
      dueDate: task.dueDate,
      startDate: task.startDate,
      endDate: task.endDate,
      status: task.status,
      imageUrl: imageUrl,
      isActive: task.isActive,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      images: images,
      assignedToUser: task.assignedToUser ? {
        userId: task.assignedToUser.userId,
        userName: task.assignedToUser.userName,
        userLastName: task.assignedToUser.userLastName,
        userImageUrl: task.assignedToUser.userImageUrl || undefined
      } : undefined,
      createdByUser: task.createdByUser ? {
        userId: task.createdByUser.userId,
        userName: task.createdByUser.userName,
        userLastName: task.createdByUser.userLastName,
        userImageUrl: task.createdByUser.userImageUrl || undefined
      } : undefined,
      _count: {
        comments: (task as any)._commentCount || 0,
        likes: (task as any)._reactionCounts?.like || 0,
        love: (task as any)._reactionCounts?.love || 0,
        laugh: (task as any)._reactionCounts?.laugh || 0,
        angry: (task as any)._reactionCounts?.angry || 0,
        wow: (task as any)._reactionCounts?.wow || 0,
        sad: (task as any)._reactionCounts?.sad || 0,
        userLike: (task as any)._reactionCounts?.userLike,
      },
      workflow,
    };

    return response;
  }
}

export default new TaskService();
