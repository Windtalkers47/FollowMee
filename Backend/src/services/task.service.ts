import { Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { TaskRepository } from '../repositories/task.repository';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto, MarkTaskDoneDto } from '../dtos/task.dto';
import { TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';
import { User } from '../entities/User';
import { TaskImageService } from './task-image.service';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { NotificationHelper } from '../utils/notification.util';
import AppDataSource from '../config/database';
import { v4 as uuidv4 } from 'uuid';

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
    
    return this.mapToResponseDto(taskWithRelations as any);
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
      if (task.status === 'done' && task.createdBy) {
        const userId = task.createdBy;
        acc[userId] = (acc[userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const userDetails = tasks.reduce((acc, task) => {
      if (task.createdBy && task.createdByUser && !acc[task.createdBy]) {
        acc[task.createdBy] = {
          userId: task.createdBy,
          userName: task.createdByUser.userName || 'Unknown',
          userLastName: task.createdByUser.userLastName || 'User'
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
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const isStatusOnlyUpdate = Object.keys(updateTaskDto).length === 1 && updateTaskDto.status !== undefined;
    
    if (!isStatusOnlyUpdate && task.createdBy !== userId) {
      throw new Error('You can only update tasks you created');
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
    if (updateTaskDto.status !== undefined) task.status = updateTaskDto.status;
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
    return this.mapToResponseDto(savedTask);
  }

  async deleteTask(taskId: string, userId: number): Promise<void> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.createdBy !== userId) {
      throw new Error('You can only delete tasks you created');
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

  async getTopPerformers(limit: number = 5): Promise<Array<{userId: number, userName: string, userLastName: string, completedTasks: number}>> {
    const stats = await this.customTaskRepository.findUserTaskStats(0);
    return stats.map(s => ({
      userId: 0,
      userName: 'Unknown',
      userLastName: 'User',
      completedTasks: parseInt(s.count as string, 10)
    }));
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

    await this.customTaskRepository.updateTaskStatus(taskId, 'todo');

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

    await this.customTaskRepository.updateTaskStatus(taskId, 'done');

    const updatedTask = await this.customTaskRepository.findWithStats(taskId);
    if (!updatedTask) {
      throw new Error('Failed to retrieve updated task');
    }

    return this.mapToResponseDto(updatedTask);
  }

  async getUserRank(userId: number): Promise<{ rank: number; completedTasks: number; totalUsers: number }> {
    // Simplified implementation - returns placeholder data
    return { rank: 1, completedTasks: 0, totalUsers: 1 };
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