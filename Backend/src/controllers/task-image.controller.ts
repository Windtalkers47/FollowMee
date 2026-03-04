import { Request, Response, NextFunction } from 'express';
import { TaskImageService } from '../services/task-image.service';
import { CreateTaskImageDto, UpdateTaskImageDto } from '../dtos/task-image.dto';

export class TaskImageController {
  constructor(private readonly taskImageService: TaskImageService) {}

  async createTaskImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const createImageDto: CreateTaskImageDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
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
      await this.taskImageService.deleteTaskImage(Number(imageId), userId);
      res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
