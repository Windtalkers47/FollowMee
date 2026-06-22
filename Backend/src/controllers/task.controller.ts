import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { 
  CreateTaskDto, 
  UpdateTaskDto, 
  TaskQueryDto, 
  MarkTaskDoneDto,
  BulkUpdateStatusDto,
  BulkDeleteDto,
  BulkAssignDto
} from '../dtos/task.dto';
import { TaskResponseDto, TaskListResponseDto } from '../dtos/task-response.dto';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import AppDataSource from '../config/database';
import { User } from '../entities/User';

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  private userRepository = AppDataSource.getRepository(User);

  /**
   * Check if user is active
   */
  private async checkUserActive(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ 
      where: { userId, isActive: true } 
    });
    return !!user;
  }

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createTaskDto: CreateTaskDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.createTask(createTaskDto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: TaskQueryDto = req.query as any;
      const result = await this.taskService.getTasks(query);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.getUserTasks(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTasksAssignedToMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.getUserTasks(userId, false);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const result = await this.taskService.getTaskById(taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const updateTaskDto: UpdateTaskDto = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.updateTask(taskId, updateTaskDto, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      await this.taskService.deleteTask(taskId, userId);
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async createTaskWithFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createTaskDto: CreateTaskDto = JSON.parse(req.body.taskData);
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      // Handle uploaded files
      const files = req.files as Express.Multer.File[];
      let imageUrls: string[] = [];

      if (files && files.length > 0) {
        imageUrls = await CloudinaryUtil.uploadMultipleImages(files);
        
        // Add uploaded images to the DTO
        createTaskDto.images = imageUrls.map((url, index) => ({
          imageUrl: url,
          imageOrder: index
        }));
      }

      const result = await this.taskService.createTask(createTaskDto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTaskWithFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const updateTaskDto: UpdateTaskDto = JSON.parse(req.body.taskData);
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      // Handle uploaded files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const imageUrls = await CloudinaryUtil.uploadMultipleImages(files);
        
        // Add uploaded images to the DTO
        updateTaskDto.images = imageUrls.map((url, index) => ({
          imageUrl: url,
          imageOrder: index
        }));
      }

      const result = await this.taskService.updateTask(taskId, updateTaskDto, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file as Express.Multer.File;
      
      if (!file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      const imageUrl = await CloudinaryUtil.uploadImage(file.buffer, file.originalname);
      
      res.status(200).json({ 
        success: true, 
        data: { imageUrl }
      });
    } catch (error) {
      next(error);
    }
  }

  async validateImageUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = req.body;
      
      if (!url) {
        res.status(400).json({ message: 'URL is required' });
        return;
      }

      // Validate the URL by fetching image headers
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        res.status(400).json({ 
          success: false,
          error: 'INVALID_URL',
          message: 'The URL does not point to a valid image or the image cannot be accessed.'
        });
        return;
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!contentType || !allowedTypes.includes(contentType)) {
        res.status(400).json({ 
          success: false,
          error: 'UNSUPPORTED_FORMAT',
          message: `The URL points to a file that is not a supported image format (${contentType || 'unknown'}).`
        });
        return;
      }

      // Check file size from content-length header
      const contentLength = response.headers.get('content-length');
      
      let fileSize: number | undefined;
      
      if (contentLength) {
        fileSize = parseInt(contentLength);
      } else {
        // If content-length is not available (due to compression), make a GET request to get actual file size
        const getResponse = await fetch(url);
        const buffer = await getResponse.arrayBuffer();
        fileSize = buffer.byteLength;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (fileSize && fileSize > maxSize) {
        res.status(400).json({ 
          success: false,
          error: 'FILE_TOO_LARGE',
          message: `The image at this URL is ${(fileSize / (1024 * 1024)).toFixed(1)}MB, which exceeds the 5MB limit.`,
          fileSize: fileSize
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        data: { 
          isValid: true,
          contentType,
          fileSize: fileSize
        }
      });
    } catch (error) {
      res.status(400).json({ 
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Unable to validate the image URL. Please check if the URL is correct and accessible.'
      });
    }
  }

  async getTopPerformers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const result = await this.taskService.getTopPerformers(limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markTaskAsDone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const markTaskDoneDto: MarkTaskDoneDto = req.body;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.markTaskAsDone(taskId, userId, markTaskDoneDto);
      
      // Get user's updated rank
      const userRank = await this.taskService.getUserRank(userId);
      
      res.status(200).json({ 
        success: true, 
        data: {
          task: result,
          userRank: userRank
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async markTaskAsUndone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.markTaskAsUndone(taskId, userId);
      
      // Get user's updated rank
      const userRank = await this.taskService.getUserRank(userId);
      
      res.status(200).json({ 
        success: true, 
        data: {
          task: result,
          userRank: userRank
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async approveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.approveTask(taskId, userId);
      
      // Get user's updated rank (the assignee's rank should be updated)
      const userRank = await this.taskService.getUserRank(result.assignedTo || userId);
      
      res.status(200).json({ 
        success: true, 
        data: {
          task: result,
          userRank: userRank
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserRank(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.getUserRank(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Bulk Actions Controllers ====================

  /**
   * Bulk update status for multiple tasks
   */
  async bulkUpdateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const bulkUpdateStatusDto: BulkUpdateStatusDto = req.body;
      const result = await this.taskService.bulkUpdateStatus(
        bulkUpdateStatusDto.taskIds,
        bulkUpdateStatusDto.status,
        userId
      );

      res.status(200).json({ 
        success: true, 
        data: result,
        message: `Updated ${result.updated} tasks successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk delete multiple tasks
   */
  async bulkDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const bulkDeleteDto: BulkDeleteDto = req.body;
      const result = await this.taskService.bulkDelete(bulkDeleteDto.taskIds, userId);

      res.status(200).json({ 
        success: true, 
        data: result,
        message: `Deleted ${result.deleted} tasks successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk assign multiple tasks to a user
   */
  async bulkAssign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const bulkAssignDto: BulkAssignDto = req.body;
      const result = await this.taskService.bulkAssign(
        bulkAssignDto.taskIds,
        bulkAssignDto.assignedTo,
        userId
      );

      res.status(200).json({ 
        success: true, 
        data: result,
        message: `Assigned ${result.assigned} tasks successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get priority summary with smart suggestions
   */
  async getPrioritySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      const result = await this.taskService.getPrioritySummary(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
