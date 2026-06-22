import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { TaskService } from '../services/task.service';
import { TaskImageService } from '../services/task-image.service';
import { TaskRepository } from '../repositories/task.repository';
import { authenticateToken } from '../middleware/auth.middleware';
import { uploadSingle, uploadMultiple } from '../utils/file-upload.util';
import AppDataSource from '../config/database';
import { Task } from '../entities/Task';
import { TaskImage } from '../entities/TaskImage';

const router = Router();

// Initialize dependencies
const taskImageService = new TaskImageService();
const taskService = new TaskService(taskImageService);
const taskController = new TaskController(taskService);

// All task routes require authentication
router.use(authenticateToken);

// Create a new task
router.post('/', (req, res, next) => taskController.createTask(req, res, next));

// Get tasks with filtering and pagination
router.get('/', (req, res, next) => taskController.getTasks(req, res, next));

// Get current user's tasks
router.get('/my-tasks', (req, res, next) => taskController.getMyTasks(req, res, next));

// Get tasks assigned to current user
router.get('/assigned-to-me', (req, res, next) => taskController.getTasksAssignedToMe(req, res, next));

// Get top performers
router.get('/top-performers', (req, res, next) => taskController.getTopPerformers(req, res, next));

// Get current user's rank
router.get('/my-rank', (req, res, next) => taskController.getUserRank(req, res, next));

// ==================== Bulk Actions Routes ====================
// IMPORTANT: Must be before /:taskId routes to avoid conflicts

// Get priority summary with smart suggestions
router.get('/priority-summary', (req, res, next) => taskController.getPrioritySummary(req, res, next));

// Bulk update status for multiple tasks
router.put('/bulk-update-status', (req, res, next) => taskController.bulkUpdateStatus(req, res, next));

// Bulk delete multiple tasks
router.delete('/bulk-delete', (req, res, next) => taskController.bulkDelete(req, res, next));

// Bulk assign multiple tasks to a user
router.put('/bulk-assign', (req, res, next) => taskController.bulkAssign(req, res, next));

// Mark task as done
router.put('/:taskId/mark-done', (req, res, next) => taskController.markTaskAsDone(req, res, next));

// Mark task as undone
router.put('/:taskId/mark-undone', (req, res, next) => taskController.markTaskAsUndone(req, res, next));

// Approve task (from review to done)
router.put('/:taskId/approve', (req, res, next) => taskController.approveTask(req, res, next));

// Get a specific task by ID
router.get('/:taskId', (req, res, next) => taskController.getTaskById(req, res, next));

// Update a task
router.put('/:taskId', (req, res, next) => taskController.updateTask(req, res, next));

// Delete a task
router.delete('/:taskId', (req, res, next) => taskController.deleteTask(req, res, next));

// File upload routes
router.post('/upload', uploadSingle, (req, res, next) => taskController.uploadImage(req, res, next));
router.post('/with-files', uploadMultiple, (req, res, next) => taskController.createTaskWithFiles(req, res, next));
router.put('/:taskId/with-files', uploadMultiple, (req, res, next) => taskController.updateTaskWithFiles(req, res, next));

// Validate image URL
router.post('/validate-url', (req, res, next) => taskController.validateImageUrl(req, res, next));

export default router;
