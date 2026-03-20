import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { TaskRepository } from '../repositories/task.repository';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto, MarkTaskDoneDto } from '../dtos/task.dto';
import { TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';
import { User } from '../entities/User';
import { TaskImageService } from './task-image.service';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import AppDataSource from '../config/database';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TaskService {
  private customTaskRepository: TaskRepository;

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private taskImageService: TaskImageService
  ) {
    // Initialize custom repository with the injected repository
    this.customTaskRepository = new TaskRepository(this.taskRepository);
  }

  async createTask(createTaskDto: CreateTaskDto, userId: number): Promise<TaskResponseDto> {
    // Check if user has permission to create tasks
    // This would be implemented with role checking logic

    const task = new Task();
    task.taskId = uuidv4();
    task.title = createTaskDto.title;
    task.description = createTaskDto.description;
    task.assignedTo = createTaskDto.assignedTo;
    task.createdBy = userId;
    task.dueDate = createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : undefined;
    task.status = createTaskDto.status || 'draft';
    task.isActive = true;

    const savedTask = await this.taskRepository.save(task);
    
    // Handle images from request - convert to task images
    if (createTaskDto.images && createTaskDto.images.length > 0) {
      // Multiple images
      for (const imageData of createTaskDto.images) {
        await this.taskImageService.createTaskImage(savedTask.taskId, {
          imageUrl: imageData.imageUrl,
          imageOrder: imageData.imageOrder || 0
        }, userId);
      }
    } else if (createTaskDto.imageUrl) {
      // Single image (backward compatibility)
      await this.taskImageService.createTaskImage(savedTask.taskId, {
        imageUrl: createTaskDto.imageUrl,
        imageOrder: 0
      }, userId);
    }
    
    // Fetch the user data separately to avoid relation issues
    const createdByUser = await AppDataSource.getRepository(User).findOne({
      where: { userId: savedTask.createdBy },
      select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail']
    });
    
    let assignedToUser: User | null = null;
    if (savedTask.assignedTo) {
      assignedToUser = await AppDataSource.getRepository(User).findOne({
        where: { userId: savedTask.assignedTo },
        select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail']
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

    // Build response with performance stats if requested
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
    // Count completed tasks by user
    const userTaskCounts = tasks.reduce((acc, task) => {
      if (task.status === 'done' && task.createdBy) {
        const userId = task.createdBy;
        acc[userId] = (acc[userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    // Get user details from tasks (user data is already loaded via relations)
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

    // Create top performers array
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
      .slice(0, 5); // Top 5 performers
  }

  async getTaskById(taskId: string): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findTaskByIdWithRelations(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.mapToResponseDto(task);
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, userId: number): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user can update this task (only creator can update their own tasks)
    if (task.createdBy !== userId) {
      throw new ForbiddenException('You can only update tasks you created');
    }

    // Update fields
    if (updateTaskDto.title !== undefined) task.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) task.description = updateTaskDto.description;
    if (updateTaskDto.assignedTo !== undefined) task.assignedTo = updateTaskDto.assignedTo;
    if (updateTaskDto.dueDate !== undefined) {
      task.dueDate = updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : undefined;
    }
    if (updateTaskDto.status !== undefined) task.status = updateTaskDto.status;
    if (updateTaskDto.isActive !== undefined) task.isActive = updateTaskDto.isActive;

    task.updatedAt = new Date();

    // Handle images update
    if (updateTaskDto.images !== undefined) {
      // Get existing images for this task
      const existingImages = await this.taskImageService.getTaskImages(task.taskId);
      
      // Deactivate all existing images (soft delete)
      for (const existingImage of existingImages) {
        await this.taskImageService.deactivateTaskImage(existingImage.imageId);
      }
      
      // Add new images if any
      if (updateTaskDto.images.length > 0) {
        for (const imageData of updateTaskDto.images) {
          await this.taskImageService.createTaskImage(task.taskId, {
            imageUrl: imageData.imageUrl,
            imageOrder: imageData.imageOrder || 0
          }, userId);
        }
      }
    } else if (updateTaskDto.imageUrl !== undefined) {
      // Single image (backward compatibility)
      // Get existing images and deactivate them
      const existingImages = await this.taskImageService.getTaskImages(task.taskId);
      for (const existingImage of existingImages) {
        await this.taskImageService.deactivateTaskImage(existingImage.imageId);
      }
      
      // Add new single image if provided
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
      throw new NotFoundException('Task not found');
    }

    // Check if user can delete this task (only creator can delete their own tasks)
    if (task.createdBy !== userId) {
      throw new ForbiddenException('You can only delete tasks you created');
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

    await this.customTaskRepository.softDelete(taskId);
  }

  async getUserTasks(userId: number, includeAssigned: boolean = true): Promise<TaskResponseDto[]> {
    const tasks = await this.customTaskRepository.findUserTasks(userId, includeAssigned);
    return await Promise.all(tasks.map(task => this.mapToResponseDto(task)));
  }

  async updateTaskStatuses(): Promise<void> {
    const now = new Date();

    // Update overdue tasks to 'past'
    const overdueTasks = await this.customTaskRepository.findOverdueTasks();
    for (const task of overdueTasks) {
      await this.customTaskRepository.updateTaskStatus(task.taskId, 'past');
    }

    // Update upcoming tasks that are now current (if needed)
    // This could be extended based on business logic
  }

  async getTopPerformers(limit: number = 5): Promise<Array<{userId: number, userName: string, userLastName: string, completedTasks: number}>> {
    return await this.customTaskRepository.getTopPerformers(limit);
  }

  async markTaskAsDone(taskId: string, userId: number, markTaskDoneDto?: MarkTaskDoneDto): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user can mark this task as done (owner or assigned user)
    if (task.createdBy !== userId && task.assignedTo !== userId) {
      throw new ForbiddenException('You can only mark tasks as done if you are the owner or assigned user');
    }

    // Check if task is already done
    if (task.status === 'done') {
      throw new ForbiddenException('Task is already marked as done');
    }

    // Update task status to done
    await this.customTaskRepository.updateTaskStatus(taskId, 'done');

    // Get the updated task with relations
    const updatedTask = await this.customTaskRepository.findTaskByIdWithRelations(taskId);
    if (!updatedTask) {
      throw new NotFoundException('Failed to retrieve updated task');
    }

    return this.mapToResponseDto(updatedTask);
  }

  async markTaskAsUndone(taskId: string, userId: number): Promise<TaskResponseDto> {
    const task = await this.customTaskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user can undo this task (owner or assigned user)
    if (task.createdBy !== userId && task.assignedTo !== userId) {
      throw new ForbiddenException('You can only undo tasks if you are the owner or assigned user');
    }

    // Check if task is not done
    if (task.status !== 'done') {
      throw new ForbiddenException('Task is not marked as done');
    }

    // Update task status back to upcoming (or previous status)
    await this.customTaskRepository.updateTaskStatus(taskId, 'upcoming');

    // Get the updated task with relations
    const updatedTask = await this.customTaskRepository.findTaskByIdWithRelations(taskId);
    if (!updatedTask) {
      throw new NotFoundException('Failed to retrieve updated task');
    }

    return this.mapToResponseDto(updatedTask);
  }

  async getUserRank(userId: number): Promise<{ rank: number; completedTasks: number; totalUsers: number }> {
    return await this.customTaskRepository.getUserRank(userId);
  }

  private async mapToResponseDto(task: Task): Promise<TaskResponseDto> {
    // Calculate counts
    const commentCount = await this.customTaskRepository.getCommentCount(task.taskId);
    const likeCounts = await this.customTaskRepository.getLikeCountsByType(task.taskId);

    // Get task images (only from task_images table now)
    const images = await this.taskImageService.getTaskImages(task.taskId);

    // For backward compatibility, set imageUrl to first image
    const imageUrl = images && images.length > 0 ? images[0].imageUrl : undefined;

    const response: TaskResponseDto = {
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
      dueDate: task.dueDate,
      status: task.status,
      imageUrl: imageUrl, // Backward compatibility
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
        comments: commentCount,
        likes: likeCounts.like,
        love: likeCounts.love,
        laugh: likeCounts.laugh,
        angry: likeCounts.angry
      }
    };

    return response;
  }
}
