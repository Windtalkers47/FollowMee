import { Router } from 'express';
import { TaskImageController } from '../controllers/task-image.controller';
import { TaskImageService } from '../services/task-image.service';
import { authenticateToken } from '../middleware/auth.middleware';
import AppDataSource from '../config/database';
import { TaskImage } from '../entities/TaskImage';
import { Task } from '../entities/Task';
import { requireTaskManage, requireTaskView } from '../middleware/task-scope.middleware';

const router = Router();

// Initialize dependencies
const taskImageService = new TaskImageService();
const taskImageController = new TaskImageController(taskImageService);

// All task image routes require authentication
router.use(authenticateToken);

// Create a new task image
router.post('/:taskId/images', requireTaskManage, (req, res, next) => taskImageController.createTaskImage(req, res, next));

// Get all images for a task
router.get('/:taskId/images', requireTaskView, (req, res, next) => taskImageController.getTaskImages(req, res, next));

// Update a task image
router.put('/images/:imageId', requireTaskManage, (req, res, next) => taskImageController.updateTaskImage(req, res, next));

// Delete a task image
router.delete('/images/:imageId', requireTaskManage, (req, res, next) => taskImageController.deleteTaskImage(req, res, next));

export default router;
