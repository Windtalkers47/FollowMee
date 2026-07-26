import { Repository } from 'typeorm';
import { TaskImage } from '../entities/TaskImage';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import { CreateTaskImageDto, UpdateTaskImageDto, TaskImageResponseDto } from '../dtos/task-image.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import AppDataSource from '../config/database';

export class TaskImageService {
  private static readonly MAX_IMAGES_PER_TASK = 10;
  private taskImageRepository: Repository<TaskImage>;
  private taskRepository: Repository<Task>;

  constructor() {
    this.taskImageRepository = AppDataSource.getRepository(TaskImage);
    this.taskRepository = AppDataSource.getRepository(Task);
  }

  async createTaskImage(
    taskId: string,
    createImageDto: CreateTaskImageDto,
    userId: number
  ): Promise<TaskImageResponseDto> {
    // Verify task exists
    const task = await this.taskRepository.findOne({ where: { taskId, isActive: true } as any });
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.createdBy !== userId && task.assignedTo !== userId) {
      throw new Error('You can only add images to tasks you created or are assigned to');
    }

    const activeImageCount = await this.taskImageRepository.count({
      where: { taskId, isActive: true } as any
    });
    if (activeImageCount >= TaskImageService.MAX_IMAGES_PER_TASK) {
      throw new Error(`A task can contain at most ${TaskImageService.MAX_IMAGES_PER_TASK} images`);
    }

    // Use the provided imageOrder, or get the highest current order
    let imageOrder = createImageDto.imageOrder;
    if (imageOrder === undefined || imageOrder === null) {
      const lastImage = await this.taskImageRepository.findOne({
        where: { taskId, isActive: true } as any,
        order: { imageOrder: 'DESC' } as any
      });
      imageOrder = lastImage ? lastImage.imageOrder + 1 : 0;
    }

    const image = new TaskImage();
    image.taskId = taskId;
    image.imageUrl = createImageDto.imageUrl;
    image.imageOrder = imageOrder;
    image.uploadedBy = userId;
    image.isActive = true;

    const savedImage = await this.taskImageRepository.save(image);
    
    // Fetch user data separately
    const user = await this.taskRepository.manager.getRepository(User).findOne({
      where: { userId: savedImage.uploadedBy },
      select: ['userId', 'userName', 'userLastName', 'userImageUrl']
    });

    return {
      imageId: savedImage.imageId,
      taskId: savedImage.taskId,
      imageUrl: savedImage.imageUrl,
      imageOrder: savedImage.imageOrder,
      uploadedBy: savedImage.uploadedBy,
      isActive: savedImage.isActive,
      createdAt: savedImage.createdAt,
      uploadedByUser: user ? {
        userId: user.userId,
        userName: user.userName,
        userLastName: user.userLastName,
        userImageUrl: user.userImageUrl || undefined
      } : undefined
    };
  }

  async getTaskImages(taskId: string): Promise<TaskImageResponseDto[]> {
    const images = await this.taskImageRepository.find({
      where: { taskId, isActive: true } as any,
      order: { imageOrder: 'ASC' } as any
    });

    return Promise.all(images.map(async (image) => {
      const user = await this.taskRepository.manager.getRepository(User).findOne({
        where: { userId: image.uploadedBy },
        select: ['userId', 'userName', 'userLastName', 'userImageUrl']
      });

      return {
        imageId: image.imageId,
        taskId: image.taskId,
        imageUrl: image.imageUrl,
        imageOrder: image.imageOrder,
        uploadedBy: image.uploadedBy,
        isActive: image.isActive,
        createdAt: image.createdAt,
        uploadedByUser: user ? {
          userId: user.userId,
          userName: user.userName,
          userLastName: user.userLastName,
          userImageUrl: user.userImageUrl || undefined
        } : undefined
      };
    }));
  }

  async updateTaskImage(
    imageId: number,
    updateImageDto: UpdateTaskImageDto,
    userId: number
  ): Promise<TaskImageResponseDto> {
    const image = await this.taskImageRepository.findOne({ where: { imageId } as any });
    if (!image) {
      throw new Error('Image not found');
    }

    if (image.uploadedBy !== userId) {
      throw new Error('You can only update images you uploaded');
    }

    if (updateImageDto.imageOrder !== undefined) {
      image.imageOrder = updateImageDto.imageOrder;
    }

    const savedImage = await this.taskImageRepository.save(image);

    const user = await this.taskRepository.manager.getRepository(User).findOne({
      where: { userId: savedImage.uploadedBy },
      select: ['userId', 'userName', 'userLastName', 'userImageUrl']
    });

    return {
      imageId: savedImage.imageId,
      taskId: savedImage.taskId,
      imageUrl: savedImage.imageUrl,
      imageOrder: savedImage.imageOrder,
      uploadedBy: savedImage.uploadedBy,
      isActive: savedImage.isActive,
      createdAt: savedImage.createdAt,
      uploadedByUser: user ? {
        userId: user.userId,
        userName: user.userName,
        userLastName: user.userLastName,
        userImageUrl: user.userImageUrl || undefined
      } : undefined
    };
  }

  async deactivateTaskImage(imageId: number): Promise<void> {
    const image = await this.taskImageRepository.findOne({ where: { imageId } as any });
    if (!image) {
      throw new Error('Image not found');
    }

    image.isActive = false;
    image.deletedAt = new Date();
    await this.taskImageRepository.save(image);
  }

  async deleteTaskImage(imageId: number, userId: number): Promise<void> {
    const image = await this.taskImageRepository.findOne({ where: { imageId } as any });
    if (!image) {
      throw new Error('Image not found');
    }

    if (image.uploadedBy !== userId) {
      throw new Error('You can only delete images you uploaded');
    }

    // Delete from Cloudinary
    if (image.imageUrl) {
      try {
        await CloudinaryUtil.deleteImage(image.imageUrl);
      } catch (error) {
        console.error('Failed to delete image from Cloudinary:', error);
      }
    }

    // Soft delete
    image.isActive = false;
    image.deletedAt = new Date();
    await this.taskImageRepository.save(image);
  }
}

export default new TaskImageService();
