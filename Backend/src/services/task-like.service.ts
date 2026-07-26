import { Repository } from 'typeorm';
import { TaskLike } from '../entities/TaskLike';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import { CreateTaskLikeDto, UpdateTaskLikeDto } from '../dtos/task-like.dto';
import { TaskLikeResponseDto, TaskLikeSummaryDto } from '../dtos/task-like.dto';
import { NotificationHelper } from '../utils/notification.util';
import AppDataSource from '../config/database';
import { webSocketService } from './websocket.service';

export class TaskLikeService {
  private taskLikeRepository: Repository<TaskLike>;
  private taskRepository: Repository<Task>;

  constructor() {
    this.taskLikeRepository = AppDataSource.getRepository(TaskLike);
    this.taskRepository = AppDataSource.getRepository(Task);
  }

  async createOrUpdateLike(
    taskId: string,
    createLikeDto: CreateTaskLikeDto,
    userId: number
  ): Promise<TaskLikeResponseDto> {
    // Verify task exists
    const task = await this.taskRepository.findOne({ where: { taskId, isActive: true } as any });
    if (!task) {
      throw new Error('Task not found');
    }

    // Check if user already liked this task
    const existingLike = await this.taskLikeRepository.findOne({
      where: { taskId, userId } as any
    });

    if (existingLike) {
      // Update existing like
      existingLike.likeType = createLikeDto.likeType;
      const savedLike = await this.taskLikeRepository.save(existingLike);
      
      // Fetch user data separately
      const user = await this.taskRepository.manager.getRepository(User).findOne({
        where: { userId: savedLike.userId },
        select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail'] as any
      });
      
      const likeWithUser = {
        ...savedLike,
        user
      };
      webSocketService.emitDomainEvent('reaction:updated', { taskId, actorUserId: userId });
      return this.mapToResponseDto(likeWithUser as any);
    } else {
      // Create new like
      const like = new TaskLike();
      like.taskId = taskId;
      like.userId = userId;
      like.likeType = createLikeDto.likeType;

      const savedLike = await this.taskLikeRepository.save(like);

      // Send notification to task creator if liker is not the creator
      if (task.createdBy !== userId) {
        await NotificationHelper.notifyTaskLike(
          task.title,
          `/posts/${taskId}`,
          userId,
          [task.createdBy]
        );
      }

      // Fetch user data separately
      const user = await this.taskRepository.manager.getRepository(User).findOne({
        where: { userId: savedLike.userId },
        select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail'] as any
      });

      const likeWithUser = {
        ...savedLike,
        user
      };

      webSocketService.emitDomainEvent('reaction:updated', { taskId, actorUserId: userId });
      return this.mapToResponseDto(likeWithUser as any);
    }
  }

  async removeLike(taskId: string, userId: number): Promise<void> {
    const like = await this.taskLikeRepository.findOne({
      where: { taskId, userId } as any
    });

    if (!like) {
      throw new Error('Like not found');
    }

    await this.taskLikeRepository.delete(like.likeId as any);
    webSocketService.emitDomainEvent('reaction:updated', { taskId, actorUserId: userId });
  }

  async getTaskLikes(taskId: string): Promise<TaskLikeResponseDto[]> {
    const likes = await this.taskLikeRepository
      .createQueryBuilder('like')
      .leftJoinAndSelect('like.user', 'user')
      .where('like.taskId = :taskId', { taskId })
      .orderBy('like.createdAt', 'DESC')
      .getMany();

    return likes.map(like => this.mapToResponseDto(like));
  }

  async getTaskLikeSummary(taskId: string, userId?: number): Promise<TaskLikeSummaryDto> {
    const likes = await this.taskLikeRepository
      .createQueryBuilder('like')
      .where('like.taskId = :taskId', { taskId })
      .getMany();

    const summary: TaskLikeSummaryDto = {
      like: 0,
      love: 0,
      laugh: 0,
      angry: 0,
      wow: 0,
      sad: 0,
      total: likes.length
    };

    for (const like of likes) {
      summary[like.likeType]++;
    }

    // Check if user has liked this task
    if (userId) {
      const userLike = likes.find(like => like.userId === userId);
      if (userLike) {
        summary.userLike = userLike.likeType;
      }
    }

    return summary;
  }

  async getUserLikeOnTask(taskId: string, userId: number): Promise<TaskLikeResponseDto | null> {
    const like = await this.taskLikeRepository.findOne({
      where: { taskId, userId } as any,
      relations: ['user']
    });

    return like ? this.mapToResponseDto(like) : null;
  }

  private mapToResponseDto(like: TaskLike & { user?: User }): TaskLikeResponseDto {
    const result: TaskLikeResponseDto = {
      likeId: like.likeId,
      taskId: like.taskId,
      userId: like.userId,
      likeType: like.likeType,
      createdAt: like.createdAt,
    };
    if (like.user) {
      result.user = {
        userId: like.user.userId,
        userName: like.user.userName,
        userLastName: like.user.userLastName,
        userImageUrl: like.user.userImageUrl || undefined
      };
    }
    return result;
  }
}

export default new TaskLikeService();
