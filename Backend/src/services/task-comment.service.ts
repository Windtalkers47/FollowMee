import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskComment } from '../entities/TaskComment';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import { CommentReaction } from '../entities/CommentReaction';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from '../dtos/task-comment.dto';
import { TaskCommentResponseDto } from '../dtos/task-comment.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { NotificationHelper } from '../utils/notification.util';

@Injectable()
export class TaskCommentService {
  constructor(
    @InjectRepository(TaskComment)
    private taskCommentRepository: Repository<TaskComment>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(CommentReaction)
    private commentReactionRepository: Repository<CommentReaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async createComment(
    taskId: string,
    createCommentDto: CreateTaskCommentDto,
    userId: number
  ): Promise<TaskCommentResponseDto> {
    // Verify task exists
    const task = await this.taskRepository.findOne({ where: { taskId, isActive: true } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // If it's a reply, verify parent comment exists
    if (createCommentDto.parentCommentId) {
      const parentComment = await this.taskCommentRepository.findOne({
        where: { commentId: createCommentDto.parentCommentId, taskId }
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = new TaskComment();
    comment.taskId = taskId;
    comment.userId = userId;
    comment.comment = createCommentDto.comment;
    comment.commentImageUrl = createCommentDto.commentImageUrl;
    comment.parentCommentId = createCommentDto.parentCommentId;

    const savedComment = await this.taskCommentRepository.save(comment);

    // Send notifications
    const recipientUserIds: number[] = [];

    // If it's a reply, notify parent comment author
    if (createCommentDto.parentCommentId) {
      const parentComment = await this.taskCommentRepository.findOne({
        where: { commentId: createCommentDto.parentCommentId }
      });
      
      if (parentComment) {
        // Notify immediate parent comment author
        if (parentComment.userId !== userId) {
          recipientUserIds.push(parentComment.userId);
          // Use reply notification type with parent comment ID for unique grouping
          NotificationHelper.notifyCommentReply(
            task.title,
            `/posts/${taskId}`,
            userId,
            [parentComment.userId],
            createCommentDto.parentCommentId
          );
        }

        // If parent comment is also a reply (nested), also notify the root comment author
        if (parentComment.parentCommentId) {
          const rootComment = await this.taskCommentRepository.findOne({
            where: { commentId: parentComment.parentCommentId }
          });
          
          if (rootComment && rootComment.userId !== userId && !recipientUserIds.includes(rootComment.userId)) {
            recipientUserIds.push(rootComment.userId);
            // Send separate notification for root comment author
            NotificationHelper.notifyCommentReply(
              task.title,
              `/posts/${taskId}`,
              userId,
              [rootComment.userId],
              rootComment.commentId
            );
          }
        }
      }
    }

    // Notify task creator if commenter is not the creator
    if (task.createdBy !== userId && !recipientUserIds.includes(task.createdBy)) {
      recipientUserIds.push(task.createdBy);
      // Send task comment notification (for task creator)
      NotificationHelper.notifyTaskComment(
        task.title,
        `/posts/${taskId}`,
        userId,
        [task.createdBy]
      );
    }

    return this.getCommentWithRelations(savedComment.commentId);
  }

  async getTaskComments(taskId: string): Promise<TaskCommentResponseDto[]> {
    // First, get all comments for this task (both parent and replies)
    const allComments = await this.taskCommentRepository
      .createQueryBuilder('comment')
      .leftJoin('comment.user', 'user')
      .addSelect([
        'user.userId',
        'user.userName', 
        'user.userLastName',
        'user.userImageUrl'
      ])
      .leftJoin('comment.reactions', 'reactions')
      .addSelect([
        'reactions.reactionId',
        'reactions.reactionType',
        'reactions.userId',
        'reactions.createdAt'
      ])
      .leftJoin('reactions.user', 'reactionUser')
      .addSelect([
        'reactionUser.userId',
        'reactionUser.userName', 
        'reactionUser.userLastName'
      ])
      .where('comment.taskId = :taskId AND comment.isActive = :isActive', { taskId, isActive: true })
      .orderBy('comment.createdAt', 'ASC')
      .getMany();

    // Separate parent comments from replies
    const parentComments = allComments.filter(comment => !comment.parentCommentId);
    const replies = allComments.filter(comment => comment.parentCommentId);

    // Build the nested structure
    const buildNestedComments = (parents: TaskComment[], allReplies: TaskComment[]): TaskComment[] => {
      return parents.map(parent => {
        const parentReplies = allReplies.filter(reply => reply.parentCommentId === parent.commentId);
        
        // Recursively build nested replies
        const nestedReplies = buildNestedComments(parentReplies, allReplies);
        
        return {
          ...parent,
          replies: nestedReplies
        };
      });
    };

    const nestedComments = buildNestedComments(parentComments, replies);

    return Promise.all(nestedComments.map(comment => this.mapToResponseDto(comment)));
  }

  async getCommentWithRelations(commentId: number): Promise<TaskCommentResponseDto> {
    const comment = await this.taskCommentRepository
      .createQueryBuilder('comment')
      .leftJoin('comment.user', 'user')
      .addSelect([
        'user.userId',
        'user.userName', 
        'user.userLastName',
        'user.userImageUrl'
      ])
      .leftJoinAndSelect('comment.replies', 'replies')
      .leftJoin('replies.user', 'repliesUser')
      .addSelect([
        'repliesUser.userId',
        'repliesUser.userName', 
        'repliesUser.userLastName',
        'repliesUser.userImageUrl'
      ])
      .leftJoinAndSelect('comment.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .where('comment.commentId = :commentId', { commentId })
      .getOne();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.mapToResponseDto(comment);
  }

  async updateComment(
    commentId: number,
    updateCommentDto: UpdateTaskCommentDto,
    userId: number
  ): Promise<TaskCommentResponseDto> {
    const comment = await this.taskCommentRepository.findOne({
      where: { commentId }
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns this comment
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    comment.comment = updateCommentDto.comment;
    if (updateCommentDto.commentImageUrl !== undefined) {
      // Delete old image from Cloudinary if it's being replaced
      if (comment.commentImageUrl && comment.commentImageUrl !== updateCommentDto.commentImageUrl) {
        try {
          await CloudinaryUtil.deleteImage(comment.commentImageUrl);
        } catch (error) {
          console.error('Failed to delete old comment image from Cloudinary:', error);
        }
      }
      comment.commentImageUrl = updateCommentDto.commentImageUrl;
    }

    const savedComment = await this.taskCommentRepository.save(comment);
    return this.getCommentWithRelations(savedComment.commentId);
  }

  async deleteComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.taskCommentRepository.findOne({
      where: { commentId }
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns this comment
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete comment image from Cloudinary if it exists
    if (comment.commentImageUrl) {
      try {
        await CloudinaryUtil.deleteImage(comment.commentImageUrl);
      } catch (error) {
        console.error('Failed to delete comment image from Cloudinary:', error);
      }
    }

    // Soft delete by setting isActive to false (keeps for audit/history)
    comment.isActive = false;
    await this.taskCommentRepository.save(comment);
  }

  async uploadCommentImage(file: Express.Multer.File): Promise<{ commentImageUrl: string }> {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }

    // For now, return a mock URL. In production, you'd upload to Cloudinary or similar
    const commentImageUrl = `https://placeholder.co/400x300?text=Comment+Image`;
    
    return { commentImageUrl };
  }

  private async mapToResponseDto(comment: TaskComment): Promise<TaskCommentResponseDto> {
    // Handle nested replies - they should already have user data from the main query
    const replies = comment.replies && comment.replies.length > 0 ? 
      await Promise.all(
        comment.replies
          .filter(reply => reply.isActive)
          .map(reply => this.mapToResponseDto(reply))
      ) : [];

    const reactions = comment.reactions?.map(reaction => ({
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
    })) || [];

    return {
      commentId: comment.commentId,
      taskId: comment.taskId,
      userId: comment.userId,
      comment: comment.comment,
      commentImageUrl: comment.commentImageUrl,
      parentCommentId: comment.parentCommentId,
      createdAt: comment.createdAt,
      isActive: comment.isActive,
      user: comment.user ? {
        userId: comment.user.userId,
        userName: comment.user.userName || 'Unknown',
        userLastName: comment.user.userLastName || 'User',
        userImageUrl: comment.user.userImageUrl || undefined
      } : {
        userId: comment.userId,
        userName: 'Unknown',
        userLastName: 'User',
        userImageUrl: undefined
      },
      replies,
      reactions,
      _count: {
        replies: replies.length,
        reactions: reactions.length
      }
    };
  }
}
