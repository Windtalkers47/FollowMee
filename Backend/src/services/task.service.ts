import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/Task';
import { TaskRepository } from '../repositories/task.repository';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from '../dtos/task.dto';
import { TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';
import { User } from '../entities/User';
import AppDataSource from '../config/database';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TaskService {
  private customTaskRepository: TaskRepository;

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>
  ) {
    // Initialize custom repository
    this.customTaskRepository = new TaskRepository();
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
    task.imageUrl = createTaskDto.imageUrl;
    task.isActive = true;

    const savedTask = await this.taskRepository.save(task);
    
    // Fetch the user data separately to avoid relation issues
    const createdByUser = await AppDataSource.getRepository(User).findOne({
      where: { userId: savedTask.createdBy }
    });
    
    let assignedToUser: User | null = null;
    if (savedTask.assignedTo) {
      assignedToUser = await AppDataSource.getRepository(User).findOne({
        where: { userId: savedTask.assignedTo }
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

    return {
      tasks: tasks.map(task => this.mapToResponseDto(task)),
      total,
      page,
      limit,
      totalPages
    };
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
    if (updateTaskDto.imageUrl !== undefined) task.imageUrl = updateTaskDto.imageUrl;
    if (updateTaskDto.status !== undefined) task.status = updateTaskDto.status;
    if (updateTaskDto.isActive !== undefined) task.isActive = updateTaskDto.isActive;

    task.updatedAt = new Date();

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

    await this.customTaskRepository.softDelete(taskId);
  }

  async getUserTasks(userId: number, includeAssigned: boolean = true): Promise<TaskResponseDto[]> {
    const tasks = await this.customTaskRepository.findUserTasks(userId, includeAssigned);
    return tasks.map(task => this.mapToResponseDto(task));
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

  private mapToResponseDto(task: Task): TaskResponseDto {
    const response: TaskResponseDto = {
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
      dueDate: task.dueDate,
      status: task.status,
      imageUrl: task.imageUrl,
      isActive: task.isActive,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignedToUser: task.assignedToUser ? {
        userId: task.assignedToUser.userId,
        userName: task.assignedToUser.userName,
        userLastName: task.assignedToUser.userLastName
      } : undefined,
      createdByUser: task.createdByUser ? {
        userId: task.createdByUser.userId,
        userName: task.createdByUser.userName,
        userLastName: task.createdByUser.userLastName
      } : undefined
    };

    return response;
  }
}
