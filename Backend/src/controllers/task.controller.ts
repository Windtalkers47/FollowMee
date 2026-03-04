import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from '../dtos/task.dto';
import { TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';

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

  async createTaskWithFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createTaskDto: CreateTaskDto = JSON.parse(req.body.taskData);
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Handle uploaded files
      const files = req.files as Express.Multer.File[];
      let imageUrls: string[] = [];

      if (files && files.length > 0) {
        imageUrls = await CloudinaryUtil.uploadMultipleImages(files);
        
        // Add uploaded images to the DTO
        createTaskDto.images = imageUrls.map((url, index) => ({
          imageUrl: url,
          imageOrder: index
        }));
      }

      const result = await this.taskService.createTask(createTaskDto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTaskWithFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const updateTaskDto: UpdateTaskDto = JSON.parse(req.body.taskData);
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Handle uploaded files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const imageUrls = await CloudinaryUtil.uploadMultipleImages(files);
        
        // Add uploaded images to the DTO
        updateTaskDto.images = imageUrls.map((url, index) => ({
          imageUrl: url,
          imageOrder: index
        }));
      }

      const result = await this.taskService.updateTask(taskId, updateTaskDto, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file as Express.Multer.File;
      
      if (!file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const imageUrl = await CloudinaryUtil.uploadImage(file.buffer, file.originalname);
      
      res.status(200).json({ 
        success: true, 
        data: { imageUrl }
      });
    } catch (error) {
      next(error);
    }
  }
}
