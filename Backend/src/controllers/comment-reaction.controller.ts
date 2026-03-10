import { Request, Response, NextFunction } from 'express';
import { CommentReactionService } from '../services/comment-reaction.service';
import { TaskCommentService } from '../services/task-comment.service';
import { CreateCommentReactionDto } from '../dtos/task-comment.dto';
import { CommentReactionResponseDto } from '../dtos/task-comment.dto';

export class CommentReactionController {
  constructor(
    private readonly commentReactionService: CommentReactionService,
    private readonly taskCommentService: TaskCommentService
  ) {}

  async createOrUpdateReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { commentId } = req.params;
      const createReactionDto: CreateCommentReactionDto = req.body;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
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
