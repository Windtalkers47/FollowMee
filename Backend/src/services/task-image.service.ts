import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskImage } from '../entities/TaskImage';
import { Task } from '../entities/Task';
import { User } from '../entities/User';
import { CreateTaskImageDto, UpdateTaskImageDto, TaskImageResponseDto } from '../dtos/task-image.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';

@Injectable()
export class TaskImageService {
  constructor(
    @InjectRepository(TaskImage)
    private taskImageRepository: Repository<TaskImage>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>
  ) {}

  async createTaskImage(
    taskId: string,
    createImageDto: CreateTaskImageDto,
    userId: number
  ): Promise<TaskImageResponseDto> {
    // Verify task exists
    const task = await this.taskRepository.findOne({ where: { taskId, isActive: true } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Use the provided imageOrder, or get the highest current order
    let imageOrder = createImageDto.imageOrder;
    if (imageOrder === undefined || imageOrder === null) {
      const lastImage = await this.taskImageRepository.findOne({
        where: { taskId, isActive: true },
        order: { imageOrder: 'DESC' }
      });
      imageOrder = lastImage ? lastImage.imageOrder + 1 : 0;
    }

    const image = new TaskImage();
    image.taskId = taskId;
    image.imageUrl = createImageDto.imageUrl;
    image.imageOrder = imageOrder;
    image.uploadedBy = userId;

    const savedImage = await this.taskImageRepository.save(image);
    
    // Fetch user data separately
    const user = await this.taskRepository.manager.getRepository(User).findOne({
      where: { userId: savedImage.uploadedBy },
      select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail']
    });
    
    if (!user) {
      throw new Error('Failed to retrieve user who uploaded the image');
    }
    
    const imageWithUser = {
      ...savedImage,
      uploadedByUser: user
    };
    
    return this.mapToResponseDto(imageWithUser as any);
  }

  async getTaskImages(taskId: string): Promise<TaskImageResponseDto[]> {
    const images = await this.taskImageRepository.find({
      where: { taskId, isActive: true },
      order: { imageOrder: 'ASC' }
    });

    // Fetch user data for each image
    const imagesWithUsers = await Promise.all(
      images.map(async (image) => {
        const user = await this.taskRepository.manager.getRepository(User).findOne({
          where: { userId: image.uploadedBy },
          select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail']
        });
        
        const imageWithUser = {
          ...image,
          uploadedByUser: user
        };
        
        return this.mapToResponseDto(imageWithUser as any);
      })
    );

    return imagesWithUsers;
  }

  async updateTaskImage(
    imageId: number,
    updateImageDto: UpdateTaskImageDto,
    userId: number
  ): Promise<TaskImageResponseDto> {
    const image = await this.taskImageRepository.findOne({
      where: { imageId, isActive: true }
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check if user owns this image or created the task
    const task = await this.taskRepository.findOne({ where: { taskId: image.taskId } });
    if (image.uploadedBy !== userId && task?.createdBy !== userId) {
      throw new ForbiddenException('You can only update images you uploaded or tasks you created');
    }

    if (updateImageDto.imageUrl !== undefined) {
      // Delete old image from Cloudinary if it's being replaced
      if (image.imageUrl && image.imageUrl !== updateImageDto.imageUrl) {
        try {
          await CloudinaryUtil.deleteImage(image.imageUrl);
        } catch (error) {
          console.error('Failed to delete old image from Cloudinary:', error);
        }
      }
      image.imageUrl = updateImageDto.imageUrl;
    }
    if (updateImageDto.imageOrder !== undefined) {
      image.imageOrder = updateImageDto.imageOrder;
    }

    const savedImage = await this.taskImageRepository.save(image);
    
    // Fetch user data
    const user = await this.taskRepository.manager.getRepository(User).findOne({
      where: { userId: savedImage.uploadedBy },
      select: ['userId', 'userName', 'userLastName', 'userImageUrl', 'userEmail']
    });
    
    const imageWithUser = {
      ...savedImage,
      uploadedByUser: user
    };
    
    return this.mapToResponseDto(imageWithUser as any);
  }

  async deleteTaskImage(imageId: number, userId: number): Promise<void> {
    const image = await this.taskImageRepository.findOne({
      where: { imageId, isActive: true }
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Check if user owns this image or created the task
    const task = await this.taskRepository.findOne({ where: { taskId: image.taskId } });
    if (image.uploadedBy !== userId && task?.createdBy !== userId) {
      throw new ForbiddenException('You can only delete images you uploaded or tasks you created');
    }

    // Delete image from Cloudinary before deactivating
    if (image.imageUrl) {
      try {
        await CloudinaryUtil.deleteImage(image.imageUrl);
      } catch (error) {
        console.error('Failed to delete image from Cloudinary:', error);
      }
    }

    await this.taskImageRepository.update(imageId, { isActive: false });
  }

  async deactivateTaskImage(imageId: number): Promise<void> {
    await this.taskImageRepository.update(imageId, { isActive: false });
  }

  private mapToResponseDto(image: TaskImage): TaskImageResponseDto {
    return {
      imageId: image.imageId,
      taskId: image.taskId,
      imageUrl: image.imageUrl,
      imageOrder: image.imageOrder,
      uploadedBy: image.uploadedBy,
      createdAt: image.createdAt,
      isActive: image.isActive,
      uploadedByUser: image.uploadedByUser ? {
        userId: image.uploadedByUser.userId,
        userName: image.uploadedByUser.userName,
        userLastName: image.uploadedByUser.userLastName,
        userImageUrl: image.uploadedByUser.userImageUrl || undefined
      } : undefined
    };
  }
}
