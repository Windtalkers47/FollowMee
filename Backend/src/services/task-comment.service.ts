import { TaskComment } from '../entities/TaskComment';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import { CommentReaction } from '../entities/CommentReaction';
import { CreateTaskCommentDto, UpdateTaskCommentDto, TaskCommentResponseDto, CommentReactionResponseDto } from '../dtos/task-comment.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { TaskRepository } from '../repositories/task.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotificationHelper } from '../utils/notification.util';
import { webSocketService } from './websocket.service';
import { In } from 'typeorm';

export class TaskCommentService {
  private taskCommentRepository: TaskCommentRepository;
  private taskRepository: TaskRepository;
  private userRepository: UserRepository;

  constructor() {
    this.taskCommentRepository = new TaskCommentRepository();
    this.taskRepository = new TaskRepository();
    this.userRepository = new UserRepository();
  }

  async createComment(
    taskId: string,
    createCommentDto: CreateTaskCommentDto,
    userId: number
  ): Promise<TaskCommentResponseDto> {
    const commentText = createCommentDto.comment?.trim();
    if (!commentText) {
      throw new Error('Comment cannot be empty');
    }
    if (commentText.length > 1000) {
      throw new Error('Comment cannot exceed 1000 characters');
    }

    // Verify task exists
    const task = await this.taskRepository.findOne({ where: { taskId, isActive: true } });
    if (!task) {
      throw new Error('Task not found');
    }

    // If it's a reply, verify parent comment exists
    if (createCommentDto.parentCommentId) {
      const parentComment = await this.taskCommentRepository.findOne({
        where: {
          commentId: createCommentDto.parentCommentId,
          taskId,
          isActive: true
        }
      });
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
    }

    const comment = new TaskComment();
    comment.taskId = taskId;
    comment.userId = userId;
    comment.comment = commentText;
    comment.parentCommentId = createCommentDto.parentCommentId;
    comment.commentImageUrl = createCommentDto.commentImageUrl;
    comment.isActive = true;

    const savedComment = await this.taskCommentRepository.save(comment);
    const hydratedComment = await this.taskCommentRepository.findOneWithRelations({
      commentId: savedComment.commentId,
      isActive: true
    });
    const response = this.mapToResponseDto(hydratedComment || savedComment);

    const recipients = new Set<number>();
    if (task.createdBy !== userId) recipients.add(task.createdBy);
    if (task.assignedTo && task.assignedTo !== userId) recipients.add(task.assignedTo);

    if (createCommentDto.parentCommentId) {
      const parent = await this.taskCommentRepository.findOne({
        where: { commentId: createCommentDto.parentCommentId, taskId, isActive: true }
      });
      if (parent && parent.userId !== userId) {
        recipients.add(parent.userId);
        await NotificationHelper.notifyCommentReply(
          task.title,
          `/posts/${taskId}`,
          userId,
          [parent.userId],
          parent.commentId
        );
      }
    } else if (recipients.size > 0) {
      await NotificationHelper.notifyTaskComment(
        task.title,
        `/posts/${taskId}`,
        userId,
        [...recipients]
      );
    }

    const mentionedHandles = [...commentText.matchAll(/@([\p{L}\p{N}._-]+)/gu)]
      .map(match => match[1].toLowerCase());
    if (mentionedHandles.length > 0) {
      const mentionedUsers = await this.userRepository.getRepository().find({
        where: {
          userName: In(mentionedHandles),
          isActive: true
        } as any
      });
      const mentionedUserIds = mentionedUsers
        .filter(mentioned => mentioned.userId !== userId)
        .map(mentioned => mentioned.userId);
      if (mentionedUserIds.length > 0) {
        await NotificationHelper.notifyMention(
          task.title,
          `/posts/${taskId}`,
          userId,
          mentionedUserIds
        );
      }
    }

    webSocketService.emitDomainEvent('comment:created', {
      taskId,
      commentId: savedComment.commentId,
      actorUserId: userId
    });

    return response;
  }

  async getCommentsByTask(taskId: string): Promise<TaskCommentResponseDto[]> {
    const comments = await this.taskCommentRepository.findByTaskId(taskId);
    return comments.map(comment => this.mapToResponseDto(comment));
  }

  async updateComment(
    commentId: number,
    updateCommentDto: UpdateTaskCommentDto,
    userId: number,
    taskId?: string
  ): Promise<TaskCommentResponseDto> {
    const comment = await this.taskCommentRepository.findOneWithRelations({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }
    if (taskId && comment.taskId !== taskId) {
      throw new Error('Comment does not belong to this task');
    }

    if (updateCommentDto.comment !== undefined) {
      const commentText = updateCommentDto.comment.trim();
      if (!commentText) {
        throw new Error('Comment cannot be empty');
      }
      if (commentText.length > 1000) {
        throw new Error('Comment cannot exceed 1000 characters');
      }
      comment.comment = commentText;
    }
    if (updateCommentDto.commentImageUrl !== undefined) {
      comment.commentImageUrl = updateCommentDto.commentImageUrl;
    }

    const updated = await this.taskCommentRepository.save(comment);
    webSocketService.emitDomainEvent('comment:updated', {
      taskId: comment.taskId,
      commentId,
      actorUserId: userId
    });
    return this.mapToResponseDto(updated);
  }

  async deleteComment(commentId: number, userId: number, taskId?: string): Promise<{ message: string }> {
    const comment = await this.taskCommentRepository.findOne({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }
    if (taskId && comment.taskId !== taskId) {
      throw new Error('Comment does not belong to this task');
    }

    // Soft delete - mark as inactive
    comment.isActive = false;
    comment.deletedAt = new Date();
    await this.taskCommentRepository.save(comment);
    webSocketService.emitDomainEvent('comment:deleted', {
      taskId: comment.taskId,
      commentId,
      actorUserId: userId
    });

    return { message: 'Comment deleted successfully' };
  }

  async uploadCommentImage(fileBuffer: Buffer, userId: number): Promise<{ imageUrl: string }> {
    if (!fileBuffer) {
      throw new Error('No file provided');
    }

    const uploadResult = await CloudinaryUtil.uploadImage(fileBuffer, 'followmee/comments');
    return { imageUrl: uploadResult };
  }

  private mapToResponseDto(comment: TaskComment): TaskCommentResponseDto {
    return {
      commentId: comment.commentId,
      taskId: comment.taskId,
      userId: comment.userId,
      comment: comment.comment,
      commentImageUrl: comment.commentImageUrl,
      parentCommentId: comment.parentCommentId,
      isActive: comment.isActive,
      createdAt: comment.createdAt,
      user: comment.user ? {
        userId: comment.user.userId,
        userName: comment.user.userName,
        userLastName: comment.user.userLastName,
        userImageUrl: comment.user.userImageUrl || undefined,
      } : undefined,
      reactions: comment.reactions?.map(reaction => this.mapReactionToResponseDto(reaction, comment.commentId)) || []
    };
  }

  private mapReactionToResponseDto(reaction: CommentReaction, commentId: number): CommentReactionResponseDto {
    return {
      reactionId: reaction.reactionId,
      commentId,
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

export default new TaskCommentService();
