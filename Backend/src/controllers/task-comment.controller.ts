import { Request, Response, NextFunction } from 'express';
import { TaskCommentService } from '../services/task-comment.service';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from '../dtos/task-comment.dto';
import { TaskCommentResponseDto } from '../dtos/task-comment.dto';

export class TaskCommentController {
  constructor(private readonly taskCommentService: TaskCommentService) {}

  async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const createCommentDto: CreateTaskCommentDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
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
      const result = await this.taskCommentService.getTaskComments(taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { commentId } = req.params;
      const updateCommentDto: UpdateTaskCommentDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const result = await this.taskCommentService.updateComment(Number(commentId), updateCommentDto, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { commentId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      await this.taskCommentService.deleteComment(Number(commentId), userId);
      res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
