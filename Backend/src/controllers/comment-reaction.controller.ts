import { Request, Response, NextFunction } from 'express';
import { CommentReactionService } from '../services/comment-reaction.service';
import { TaskCommentService } from '../services/task-comment.service';
import { CreateCommentReactionDto } from '../dtos/task-comment.dto';
import { CommentReactionResponseDto } from '../dtos/task-comment.dto';
import AppDataSource from '../config/database';
import { User } from '../entities/User';

export class CommentReactionController {
  constructor(
    private readonly commentReactionService: CommentReactionService,
    private readonly taskCommentService: TaskCommentService
  ) {}

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

  async createOrUpdateReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { commentId } = req.params;
      const createReactionDto: CreateCommentReactionDto = req.body;
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

      const result = await this.commentReactionService.createOrUpdateReaction(
        Number(commentId), 
        createReactionDto, 
        userId
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { commentId } = req.params;
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

      await this.commentReactionService.removeReaction(Number(commentId), userId);
      res.status(200).json({ success: true, message: 'Reaction removed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getCommentReactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { commentId } = req.params;
      const result = await this.commentReactionService.getCommentReactions(Number(commentId));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async uploadCommentImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      
      if (!file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const result = await this.taskCommentService.uploadCommentImage(file);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
