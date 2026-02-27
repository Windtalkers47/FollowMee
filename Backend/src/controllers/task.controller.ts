import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from '../dtos/task.dto';
import { TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createTaskDto: CreateTaskDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const result = await this.taskService.createTask(createTaskDto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: TaskQueryDto = req.query as any;
      const result = await this.taskService.getTasks(query);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const result = await this.taskService.getUserTasks(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTasksAssignedToMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const result = await this.taskService.getUserTasks(userId, false);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const result = await this.taskService.getTaskById(taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const updateTaskDto: UpdateTaskDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const result = await this.taskService.updateTask(taskId, updateTaskDto, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      await this.taskService.deleteTask(taskId, userId);
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
