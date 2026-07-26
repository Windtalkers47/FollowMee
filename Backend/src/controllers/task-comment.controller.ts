import { Request, Response, NextFunction } from 'express';
import { TaskCommentService } from '../services/task-comment.service';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from '../dtos/task-comment.dto';
import { TaskCommentResponseDto } from '../dtos/task-comment.dto';
import AppDataSource from '../config/database';
import { User } from '../entities/User';

export class TaskCommentController {
  constructor(private readonly taskCommentService: TaskCommentService) {}

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

  async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const createCommentDto: CreateTaskCommentDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      if (
        typeof createCommentDto.comment !== 'string' ||
        !createCommentDto.comment.trim() ||
        createCommentDto.comment.trim().length > 1000
      ) {
        res.status(400).json({ message: 'Comment must contain between 1 and 1000 characters' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskCommentService.createComment(taskId, createCommentDto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTaskComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      if (!userId || !(await this.checkUserActive(userId))) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }
      const result = await this.taskCommentService.getCommentsByTask(taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId, commentId } = req.params;
      const updateCommentDto: UpdateTaskCommentDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      if (
        typeof updateCommentDto.comment !== 'string' ||
        !updateCommentDto.comment.trim() ||
        updateCommentDto.comment.trim().length > 1000
      ) {
        res.status(400).json({ message: 'Comment must contain between 1 and 1000 characters' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskCommentService.updateComment(Number(commentId), updateCommentDto, userId, taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId, commentId } = req.params;
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

      await this.taskCommentService.deleteComment(Number(commentId), userId, taskId);
      res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
