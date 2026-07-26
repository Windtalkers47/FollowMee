import { CommentReaction } from '../entities/CommentReaction';
import { TaskComment } from '../entities/TaskComment';
import { CommentReactionResponseDto, CreateCommentReactionDto } from '../dtos/task-comment.dto';
import { CommentReactionRepository } from '../repositories/comment-reaction.repository';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { TaskRepository } from '../repositories/task.repository';
import { NotificationHelper } from '../utils/notification.util';
import { webSocketService } from './websocket.service';

export class CommentReactionService {
  private commentReactionRepository: CommentReactionRepository;
  private taskCommentRepository: TaskCommentRepository;
  private taskRepository: TaskRepository;

  constructor() {
    this.commentReactionRepository = new CommentReactionRepository();
    this.taskCommentRepository = new TaskCommentRepository();
    this.taskRepository = new TaskRepository();
  }

  async createOrUpdateReaction(
    commentId: number,
    createReactionDto: CreateCommentReactionDto,
    userId: number
  ): Promise<CommentReactionResponseDto> {
    // Verify comment exists
    const comment = await this.taskCommentRepository.findOne({
      where: { commentId, isActive: true }
    });
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if user already has a reaction on this comment
    const existingReaction = await this.commentReactionRepository.findByCommentAndUser(commentId, userId);

    if (existingReaction) {
      // Update existing reaction
      existingReaction.reactionType = createReactionDto.reactionType;
      const savedReaction = await this.commentReactionRepository.save(existingReaction);
      await this.afterReactionChanged(comment, userId);
      return this.mapToResponseDto(savedReaction);
    } else {
      // Create new reaction
      const reaction = new CommentReaction();
      reaction.commentId = commentId;
      reaction.userId = userId;
      reaction.reactionType = createReactionDto.reactionType;

      const savedReaction = await this.commentReactionRepository.save(reaction);
      await this.afterReactionChanged(comment, userId);
      return this.mapToResponseDto(savedReaction);
    }
  }

  async getReactionsByCommentId(commentId: number): Promise<CommentReactionResponseDto[]> {
    const reactions = await this.commentReactionRepository.findByCommentId(commentId);
    return reactions.map(reaction => this.mapToResponseDto(reaction));
  }

  async deleteReaction(commentId: number, userId: number): Promise<{ message: string }> {
    const reaction = await this.commentReactionRepository.findByCommentAndUser(commentId, userId);

    if (!reaction) {
      throw new Error('Reaction not found');
    }

    await this.commentReactionRepository.deleteReaction(commentId, userId);
    const comment = await this.taskCommentRepository.findOne({
      where: { commentId, isActive: true }
    });
    if (comment) {
      webSocketService.emitDomainEvent('reaction:updated', {
        taskId: comment.taskId,
        commentId,
        actorUserId: userId
      });
    }
    return { message: 'Reaction removed successfully' };
  }

  private async afterReactionChanged(comment: TaskComment, userId: number): Promise<void> {
    if (comment.userId !== userId) {
      const task = await this.taskRepository.findById(comment.taskId);
      if (task) {
        await NotificationHelper.notifyCommentReaction(
          task.title,
          `/posts/${task.taskId}`,
          userId,
          [comment.userId],
          comment.commentId
        );
      }
    }

    webSocketService.emitDomainEvent('reaction:updated', {
      taskId: comment.taskId,
      commentId: comment.commentId,
      actorUserId: userId
    });
  }

  /**
   * Alias for deleteReaction - used by controller
   */
  async removeReaction(commentId: number, userId: number): Promise<{ message: string }> {
    return this.deleteReaction(commentId, userId);
  }

  /**
   * Alias for getReactionsByCommentId - used by controller
   */
  async getCommentReactions(commentId: number): Promise<CommentReactionResponseDto[]> {
    return this.getReactionsByCommentId(commentId);
  }

  private mapToResponseDto(reaction: CommentReaction): CommentReactionResponseDto {
    return {
      reactionId: reaction.reactionId,
      commentId: reaction.commentId,
      userId: reaction.userId,
      reactionType: reaction.reactionType,
      createdAt: reaction.createdAt,
      user: reaction.user ? {
        userId: reaction.user.userId,
        userName: reaction.user.userName,
        userLastName: reaction.user.userLastName,
      } : undefined
    };
  }
}

export default new CommentReactionService();
