import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentReaction } from '../entities/CommentReaction';
import { TaskComment } from '../entities/TaskComment';
import { CreateCommentReactionDto } from '../dtos/task-comment.dto';
import { CommentReactionResponseDto } from '../dtos/task-comment.dto';

@Injectable()
export class CommentReactionService {
  constructor(
    @InjectRepository(CommentReaction)
    private commentReactionRepository: Repository<CommentReaction>,
    @InjectRepository(TaskComment)
    private taskCommentRepository: Repository<TaskComment>
  ) {}

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
      throw new NotFoundException('Comment not found');
    }

    // Check if user already has a reaction on this comment
    const existingReaction = await this.commentReactionRepository.findOne({
      where: { commentId, userId },
      relations: ['user']
    });

    if (existingReaction) {
      // Update existing reaction
      existingReaction.reactionType = createReactionDto.reactionType;
      const savedReaction = await this.commentReactionRepository.save(existingReaction);
      return this.mapToResponseDto(savedReaction);
    } else {
      // Create new reaction
      const reaction = new CommentReaction();
      reaction.commentId = commentId;
      reaction.userId = userId;
      reaction.reactionType = createReactionDto.reactionType;

      const savedReaction = await this.commentReactionRepository.save(reaction);
      return this.mapToResponseDto(savedReaction);
    }
  }

  async removeReaction(commentId: number, userId: number): Promise<void> {
    const reaction = await this.commentReactionRepository.findOne({
      where: { commentId, userId }
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.commentReactionRepository.delete(reaction.reactionId);
  }

  async getCommentReactions(commentId: number): Promise<CommentReactionResponseDto[]> {
    const reactions = await this.commentReactionRepository
      .createQueryBuilder('reaction')
      .leftJoinAndSelect('reaction.user', 'user')
      .where('reaction.commentId = :commentId', { commentId })
      .orderBy('reaction.createdAt', 'ASC')
      .getMany();

    return reactions.map(reaction => this.mapToResponseDto(reaction));
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
        userLastName: reaction.user.userLastName
      } : undefined
    };
  }
}
