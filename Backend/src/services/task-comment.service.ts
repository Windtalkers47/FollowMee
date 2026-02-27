import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskComment } from '../entities/TaskComment';
import { Task } from '../entities/Task';
import { CreateTaskCommentDto, UpdateTaskCommentDto } from '../dtos/task-comment.dto';
import { TaskCommentResponseDto } from '../dtos/task-comment.dto';

@Injectable()
export class TaskCommentService {
  constructor(
    @InjectRepository(TaskComment)
    private taskCommentRepository: Repository<TaskComment>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>
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

    const comment = new TaskComment();
    comment.taskId = taskId;
    comment.userId = userId;
    comment.comment = createCommentDto.comment;

    const savedComment = await this.taskCommentRepository.save(comment);
    return this.mapToResponseDto(savedComment);
  }

  async getTaskComments(taskId: string): Promise<TaskCommentResponseDto[]> {
    const comments = await this.taskCommentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.taskId = :taskId', { taskId })
      .orderBy('comment.createdAt', 'ASC')
      .getMany();

    return comments.map(comment => this.mapToResponseDto(comment));
  }

  async updateComment(
    commentId: number,
    updateCommentDto: UpdateTaskCommentDto,
    userId: number
  ): Promise<TaskCommentResponseDto> {
    const comment = await this.taskCommentRepository.findOne({
      where: { commentId },
      relations: ['user']
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns this comment
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    comment.comment = updateCommentDto.comment;
    const savedComment = await this.taskCommentRepository.save(comment);
    return this.mapToResponseDto(savedComment);
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

    await this.taskCommentRepository.delete(commentId);
  }

  private mapToResponseDto(comment: TaskComment): TaskCommentResponseDto {
    return {
      commentId: comment.commentId,
      taskId: comment.taskId,
      userId: comment.userId,
      comment: comment.comment,
      createdAt: comment.createdAt,
      user: {
        userId: comment.user.userId,
        userName: comment.user.userName,
        userLastName: comment.user.userLastName
      }
    };
  }
}
