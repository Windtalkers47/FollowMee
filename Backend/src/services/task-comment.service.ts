import { TaskComment } from '../entities/TaskComment';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import { CommentReaction } from '../entities/CommentReaction';
import { CreateTaskCommentDto, UpdateTaskCommentDto, TaskCommentResponseDto, CommentReactionResponseDto } from '../dtos/task-comment.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { TaskCommentRepository } from '../repositories/task-comment.repository';
import { TaskRepository } from '../repositories/task.repository';
import { UserRepository } from '../repositories/user.repository';

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
    // Verify task exists
    const task = await this.taskRepository.findOne({ where: { taskId, isActive: true } });
    if (!task) {
      throw new Error('Task not found');
    }

    // If it's a reply, verify parent comment exists
    if (createCommentDto.parentCommentId) {
      const parentComment = await this.taskCommentRepository.findOne({
        where: { commentId: createCommentDto.parentCommentId }
      });
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
    }

    const comment = new TaskComment();
    comment.taskId = taskId;
    comment.userId = userId;
    comment.comment = createCommentDto.comment;
    comment.parentCommentId = createCommentDto.parentCommentId;
    comment.commentImageUrl = createCommentDto.commentImageUrl;
    comment.isActive = true;

    const savedComment = await this.taskCommentRepository.save(comment);

    return this.mapToResponseDto(savedComment);
  }

  async getCommentsByTask(taskId: string): Promise<TaskCommentResponseDto[]> {
    const comments = await this.taskCommentRepository.findByTaskId(taskId);
    return comments.map(comment => this.mapToResponseDto(comment));
  }

  async updateComment(
    commentId: number,
    updateCommentDto: UpdateTaskCommentDto,
    userId: number
  ): Promise<TaskCommentResponseDto> {
    const comment = await this.taskCommentRepository.findOneWithRelations({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (updateCommentDto.comment !== undefined) {
      comment.comment = updateCommentDto.comment;
    }
    if (updateCommentDto.commentImageUrl !== undefined) {
      comment.commentImageUrl = updateCommentDto.commentImageUrl;
    }

    const updated = await this.taskCommentRepository.save(comment);
    return this.mapToResponseDto(updated);
  }

  async deleteComment(commentId: number, userId: number): Promise<{ message: string }> {
    const comment = await this.taskCommentRepository.findOne({ commentId });
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Soft delete - mark as inactive
    comment.isActive = false;
    comment.deletedAt = new Date();
    await this.taskCommentRepository.save(comment);

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