import { Request, Response, NextFunction } from 'express';
import { TaskLikeService } from '../services/task-like.service';
import { CreateTaskLikeDto } from '../dtos/task-like.dto';
import { TaskLikeResponseDto, TaskLikeSummaryDto } from '../dtos/task-like.dto';

export class TaskLikeController {
  constructor(private readonly taskLikeService: TaskLikeService) {}

  async createOrUpdateLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const createLikeDto: CreateTaskLikeDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const result = await this.taskLikeService.createOrUpdateLike(taskId, createLikeDto, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      await this.taskLikeService.removeLike(taskId, userId);
      res.status(200).json({ success: true, message: 'Like removed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getTaskLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const result = await this.taskLikeService.getTaskLikes(taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTaskLikeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      const result = await this.taskLikeService.getTaskLikeSummary(taskId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyLikeOnTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const result = await this.taskLikeService.getUserLikeOnTask(taskId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
