import { Request, Response, NextFunction } from 'express';
import { TaskImageService } from '../services/task-image.service';
import { CreateTaskImageDto, UpdateTaskImageDto } from '../dtos/task-image.dto';
import AppDataSource from '../config/database';
import { User } from '../entities/User';

export class TaskImageController {
  constructor(private readonly taskImageService: TaskImageService) {}

  private userRepository = AppDataSource.getRepository(User);

  /**
   * Check if user is active
   */
  private async checkUserActive(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ 
      where: { userId, isActive: true } 
    });
    return !!user;
  }

  async createTaskImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const createImageDto: CreateTaskImageDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskImageService.createTaskImage(taskId, createImageDto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTaskImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const result = await this.taskImageService.getTaskImages(taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTaskImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageId } = req.params;
      const updateImageDto: UpdateTaskImageDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskImageService.updateTaskImage(Number(imageId), updateImageDto, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteTaskImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      await this.taskImageService.deleteTaskImage(Number(imageId), userId);
      res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
