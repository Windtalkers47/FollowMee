import { Router } from 'express';
import { TaskImageController } from '../controllers/task-image.controller';
import { TaskImageService } from '../services/task-image.service';
import { authenticateToken } from '../middleware/auth.middleware';
import AppDataSource from '../config/database';
import { TaskImage } from '../entities/TaskImage';
import { Task } from '../entities/Task';

const router = Router();

// Initialize dependencies
const taskImageService = new TaskImageService(AppDataSource.getRepository(TaskImage), AppDataSource.getRepository(Task));
const taskImageController = new TaskImageController(taskImageService);

// All task image routes require authentication
router.use(authenticateToken);

// Create a new task image
router.post('/:taskId/images', (req, res, next) => taskImageController.createTaskImage(req, res, next));

// Get all images for a task
router.get('/:taskId/images', (req, res, next) => taskImageController.getTaskImages(req, res, next));

// Update a task image
router.put('/images/:imageId', (req, res, next) => taskImageController.updateTaskImage(req, res, next));

// Delete a task image
router.delete('/images/:imageId', (req, res, next) => taskImageController.deleteTaskImage(req, res, next));

export default router;
