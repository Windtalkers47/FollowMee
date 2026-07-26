import { Repository, In } from 'typeorm';
import { Task } from '../entities/Task';
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
import { TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';
import { User } from '../entities/User';
import { TaskImageService } from './task-image.service';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { NotificationHelper } from '../utils/notification.util';
import AppDataSource from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { addDays, isPast, isToday, isTomorrow } from 'date-fns';
import { webSocketService } from './websocket.service';

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

  constructor(taskImageService?: TaskImageService) {
    this.customTaskRepository = new TaskRepository();
    this.taskImageService = taskImageService || new TaskImageService();
    this.taskRepository = AppDataSource.getRepository(Task);
  }

  async createTask(createTaskDto: CreateTaskDto, userId: number): Promise<TaskResponseDto> {
    if ((createTaskDto.images?.length || 0) > 10) {
      throw new Error('A task can contain at most 10 images');
    }
    const task = new Task();
    task.taskId = uuidv4();
    task.title = createTaskDto.title;
    task.description = createTaskDto.description;
    task.assignedTo = createTaskDto.assignedTo;
    task.createdBy = userId;
    task.dueDate = createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : undefined;
    task.startDate = createTaskDto.startDate ? new Date(createTaskDto.startDate) : undefined;
    task.endDate = createTaskDto.endDate ? new Date(createTaskDto.endDate) : undefined;
    task.status = createTaskDto.status || 'draft';
    task.isActive = true;
    task.completionScore = 0;
    task.reopenedCount = 0;

    const savedTask = await this.taskRepository.save(task);

    // Send notification if task is assigned to someone
    if (savedTask.assignedTo && savedTask.assignedTo !== userId) {
      NotificationHelper.notifyTaskAssigned(
        savedTask.title,
        `/posts/${savedTask.taskId}`,
        userId,
        [savedTask.assignedTo]
      );
    }

    // Handle images from request - convert to task images
    if (createTaskDto.images && createTaskDto.images.length > 0) {
      for (const imageData of createTaskDto.images) {
        await this.taskImageService.createTaskImage(savedTask.taskId, {
          imageUrl: imageData.imageUrl,
          imageOrder: imageData.imageOrder || 0
        }, userId);
      }
    } else if (createTaskDto.imageUrl) {
      await this.taskImageService.createTaskImage(savedTask.taskId, {
        imageUrl: createTaskDto.imageUrl,
        imageOrder: 0
      }, userId);
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
    
    const response = await this.mapToResponseDto(taskWithRelations as any);
    webSocketService.emitDomainEvent('task:created', {
      taskId: savedTask.taskId,
      actorUserId: userId,
      status: savedTask.status
    });
    return response;
  }

  async getTasks(query: TaskQueryDto): Promise<TaskListResponseDto> {
    const [tasks, total] = await this.customTaskRepository.findTasksWithRelations(query);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    const response: TaskListResponseDto = {
      tasks: await Promise.all(tasks.map(task => this.mapToResponseDto(task))),
      total,
      page,
      limit,
      totalPages
    };

    // Add performance statistics if requested
    if (query.includeStats && tasks.length > 0) {
      response.topPerformers = this.calculateTopPerformers(tasks);
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

  async getTaskById(taskId: string): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findWithStats(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    return this.mapToResponseDto(task);
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, userId: number): Promise<TaskResponseDto> {
    if ((updateTaskDto.images?.length || 0) > 10) {
      throw new Error('A task can contain at most 10 images');
    }
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const isStatusOnlyUpdate = Object.keys(updateTaskDto).length === 1 && updateTaskDto.status !== undefined;
    
    // Allow both creator and assigned user to update the task
    if (!isStatusOnlyUpdate && task.createdBy !== userId && task.assignedTo !== userId) {
      throw new Error('You can only update tasks you created or are assigned to');
    }
    
    if (isStatusOnlyUpdate && task.createdBy !== userId && task.assignedTo !== userId) {
      throw new Error('You can only update task status if you are the creator or assigned user');
    }

    if (updateTaskDto.title !== undefined) task.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) task.description = updateTaskDto.description;
    if (updateTaskDto.assignedTo !== undefined) {
      const oldAssignedTo = task.assignedTo;
      task.assignedTo = updateTaskDto.assignedTo;

      if (task.assignedTo && task.assignedTo !== oldAssignedTo && task.assignedTo !== userId) {
        NotificationHelper.notifyTaskAssigned(
          task.title,
          `/posts/${task.taskId}`,
          userId,
          [task.assignedTo]
        );
      }
    }
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
      if (updateTaskDto.status === 'done') {
        if (task.createdBy !== userId || task.status !== 'review') {
          throw new Error('Only the task creator can approve a task that is in review');
        }
        const completedAt = new Date();
        const onTimeBonus = task.dueDate && completedAt <= new Date(task.dueDate) ? 3 : 0;
        const reopenPenalty = Math.min((task.reopenedCount || 0) * 2, 6);
        task.status = 'done';
        task.completedAt = completedAt;
        task.completionScore = Math.max(4, 10 + onTimeBonus - reopenPenalty);
      } else {
        if (task.status === 'done') {
          task.reopenedCount = (task.reopenedCount || 0) + 1;
          task.completedAt = undefined;
          task.completionScore = 0;
        }
        task.status = updateTaskDto.status;
      }
    }
    if (updateTaskDto.isActive !== undefined) task.isActive = updateTaskDto.isActive;

    task.updatedAt = new Date();

    // Handle images update
    if (updateTaskDto.images !== undefined) {
      const existingImages = await this.taskImageService.getTaskImages(task.taskId);
      
      for (const existingImage of existingImages) {
        await this.taskImageService.deactivateTaskImage(existingImage.imageId);
      }
      
      if (updateTaskDto.images.length > 0) {
        for (const imageData of updateTaskDto.images) {
          await this.taskImageService.createTaskImage(task.taskId, {
            imageUrl: imageData.imageUrl,
            imageOrder: imageData.imageOrder || 0
          }, userId);
        }
      }
    } else if (updateTaskDto.imageUrl !== undefined) {
      const existingImages = await this.taskImageService.getTaskImages(task.taskId);
      for (const existingImage of existingImages) {
        await this.taskImageService.deactivateTaskImage(existingImage.imageId);
      }
      
      if (updateTaskDto.imageUrl) {
        await this.taskImageService.createTaskImage(task.taskId, {
          imageUrl: updateTaskDto.imageUrl,
          imageOrder: 0
        }, userId);
      }
    }

    const savedTask = await this.taskRepository.save(task);
    const response = await this.mapToResponseDto(savedTask);
    webSocketService.emitDomainEvent('task:updated', {
      taskId: savedTask.taskId,
      actorUserId: userId,
      status: savedTask.status
    });
    return response;
  }

  async deleteTask(taskId: string, userId: number): Promise<void> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.createdBy !== userId && task.assignedTo !== userId) {
      throw new Error('You can only delete tasks you created or are assigned to');
    }

    // Delete all associated images from Cloudinary before deleting the task
    const images = await this.taskImageService.getTaskImages(taskId);
    for (const image of images) {
      if (image.imageUrl) {
        try {
          await CloudinaryUtil.deleteImage(image.imageUrl);
        } catch (error) {
          console.error('Failed to delete image from Cloudinary:', error);
        }
      }
    }

    // Soft delete by marking as inactive
    task.isActive = false;
    await this.taskRepository.save(task);
    webSocketService.emitDomainEvent('task:deleted', { taskId, actorUserId: userId });
  }

  async getUserTasks(userId: number, includeAssigned: boolean = true): Promise<TaskResponseDto[]> {
    const tasks = await this.customTaskRepository.findTasksByAssignedUser(userId);
    return await Promise.all(tasks.map(task => this.mapToResponseDto(task)));
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
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.createdBy !== userId && task.assignedTo !== userId) {
      throw new Error('You can only mark tasks as done if you are the owner or assigned user');
    }

    if (task.status === 'done' || task.status === 'review') {
      throw new Error('Task is already marked as done or in review');
    }

    await this.customTaskRepository.updateTaskStatus(taskId, 'review');
    webSocketService.emitDomainEvent('task:updated', {
      taskId,
      actorUserId: userId,
      status: 'review'
    });

    const updatedTask = await this.customTaskRepository.findWithStats(taskId);
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task');
    }

    return this.mapToResponseDto(updatedTask);
  }

  async markTaskAsUndone(taskId: string, userId: number): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'review' && task.createdBy !== userId) {
      throw new Error('Only task creator can reject a task in review');
    }

    if (task.status === 'done' && task.createdBy !== userId && task.assignedTo !== userId) {
      throw new Error('You can only undo tasks if you are the owner or assigned user');
    }

    if (task.status !== 'review' && task.status !== 'done') {
      throw new Error('Task is not in review or done status');
    }

    task.status = 'todo';
    task.completedAt = undefined;
    task.completionScore = 0;
    task.reopenedCount = (task.reopenedCount || 0) + 1;
    await this.taskRepository.save(task);
    webSocketService.emitDomainEvent('task:updated', {
      taskId,
      actorUserId: userId,
      status: 'todo'
    });

    const updatedTask = await this.customTaskRepository.findWithStats(taskId);
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task');
    }

    return this.mapToResponseDto(updatedTask);
  }

  async approveTask(taskId: string, userId: number): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.createdBy !== userId) {
      throw new Error('Only task creator can approve tasks');
    }

    if (task.status !== 'review') {
      throw new Error('Task is not in review status');
    }

    const completedAt = new Date();
    const onTimeBonus = task.dueDate && completedAt <= new Date(task.dueDate) ? 3 : 0;
    const reopenPenalty = Math.min((task.reopenedCount || 0) * 2, 6);
    task.status = 'done';
    task.completedAt = completedAt;
    task.completionScore = Math.max(4, 10 + onTimeBonus - reopenPenalty);
    await this.taskRepository.save(task);
    webSocketService.emitDomainEvent('task:updated', {
      taskId,
      actorUserId: userId,
      status: 'done'
    });

    const updatedTask = await this.customTaskRepository.findWithStats(taskId);
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task');
    }

    return this.mapToResponseDto(updatedTask);
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
  ): Promise<{ updated: number; failed: string[] }> {
    const failed: string[] = [];
    let updated = 0;

    for (const taskId of taskIds) {
      try {
        const task = await this.customTaskRepository.findById(taskId);
        if (!task) {
          failed.push(taskId);
          continue;
        }

        // Check permission - user must be creator or assigned to
        if (task.createdBy !== userId && task.assignedTo !== userId) {
          failed.push(taskId);
          continue;
        }

        if (status === 'done') {
          if (task.createdBy !== userId || task.status !== 'review') {
            failed.push(taskId);
            continue;
          }
          const completedAt = new Date();
          const onTimeBonus = task.dueDate && completedAt <= new Date(task.dueDate) ? 3 : 0;
          const reopenPenalty = Math.min((task.reopenedCount || 0) * 2, 6);
          task.status = 'done';
          task.completedAt = completedAt;
          task.completionScore = Math.max(4, 10 + onTimeBonus - reopenPenalty);
          await this.taskRepository.save(task);
        } else {
          if (task.status === 'done') {
            task.reopenedCount = (task.reopenedCount || 0) + 1;
            task.completedAt = undefined;
            task.completionScore = 0;
            task.status = status;
            await this.taskRepository.save(task);
          } else {
            await this.customTaskRepository.updateTaskStatus(taskId, status);
          }
        }
        updated++;
      } catch (error) {
        failed.push(taskId);
      }
    }

    if (updated > 0) {
      webSocketService.emitDomainEvent('task:updated', { taskIds, actorUserId: userId, status });
    }
    return { updated, failed };
  }

  /**
   * Delete multiple tasks at once (soft delete)
   */
  async bulkDelete(taskIds: string[], userId: number): Promise<{ deleted: number; failed: string[] }> {
    const failed: string[] = [];
    let deleted = 0;

    for (const taskId of taskIds) {
      try {
        const task = await this.customTaskRepository.findById(taskId);
        if (!task) {
          failed.push(taskId);
          continue;
        }

        // Check permission - user must be creator or assigned to
        if (task.createdBy !== userId && task.assignedTo !== userId) {
          failed.push(taskId);
          continue;
        }

        // Soft delete by marking as inactive
        task.isActive = false;
        await this.taskRepository.save(task);
        deleted++;
      } catch (error) {
        failed.push(taskId);
      }
    }

    if (deleted > 0) {
      webSocketService.emitDomainEvent('task:deleted', { taskIds, actorUserId: userId });
    }
    return { deleted, failed };
  }

  /**
   * Assign multiple tasks to a user at once
   */
  async bulkAssign(taskIds: string[], assignedTo: number | undefined, userId: number): Promise<{ assigned: number; failed: string[] }> {
    const failed: string[] = [];
    let assigned = 0;

    for (const taskId of taskIds) {
      try {
        const task = await this.customTaskRepository.findById(taskId);
        if (!task) {
          failed.push(taskId);
          continue;
        }

        // Check permission - only creator can reassign tasks
        if (task.createdBy !== userId) {
          failed.push(taskId);
          continue;
        }

        const oldAssignedTo = task.assignedTo;
        task.assignedTo = assignedTo;

        // Send notification if task is assigned to someone new
        if (assignedTo && assignedTo !== oldAssignedTo && assignedTo !== userId) {
          NotificationHelper.notifyTaskAssigned(
            task.title,
            `/posts/${task.taskId}`,
            userId,
            [assignedTo]
          );
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
        assignedTo
      });
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
    const [allTasks] = await this.customTaskRepository.findTasksWithRelations({
      assignedTo: userId,
      page: 1,
      limit: 1000
    });

    const activeTasks = allTasks.filter(task => task.isActive && task.status !== 'done' && task.status !== 'cancelled');

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

  private async mapToResponseDto(task: Task): Promise<TaskResponseDto> {
    // Get task images
    const images = await this.taskImageService.getTaskImages(task.taskId);
    const imageUrl = images && images.length > 0 ? images[0].imageUrl : undefined;

    const response: TaskResponseDto = {
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
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
        comments: 0,
        likes: 0,
        love: 0,
        laugh: 0,
        angry: 0
      }
    };

    return response;
  }
}

export default new TaskService();
