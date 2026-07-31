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
/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Search and page through the organization schedule
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, todo, in_progress, review, done, cancelled] }
 *       - in: query
 *         name: dueFilter
 *         schema: { type: string, enum: [all, overdue, today, soon, week] }
 *       - in: query
 *         name: includeFocus
 *         schema: { type: boolean }
 *         description: Include organization focus and status counts without an extra request
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200: { description: Paged tasks plus optional organization focus }
 */
router.get('/', (req, res, next) => taskController.getTasks(req, res, next));

// Get current user's tasks
router.get('/my-tasks', (req, res, next) => taskController.getMyTasks(req, res, next));

// Get tasks assigned to current user
router.get('/assigned-to-me', (req, res, next) => taskController.getTasksAssignedToMe(req, res, next));

/**
 * @swagger
 * /tasks/my-work:
 *   get:
 *     tags: [Tasks]
 *     summary: Get actionable work for the current user
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: Tasks assigned to the user and tasks awaiting creator approval }
 *       401: { description: User is not authenticated }
 */
router.get('/my-work', (req, res, next) => taskController.getMyWork(req, res, next));

// Get top performers
router.get('/top-performers', (req, res, next) => taskController.getTopPerformers(req, res, next));

// Get current user's rank
router.get('/my-rank', (req, res, next) => taskController.getUserRank(req, res, next));

// ==================== Bulk Actions Routes ====================
// IMPORTANT: Must be before /:taskId routes to avoid conflicts

// Deprecated compatibility endpoint. New clients use focus embedded in task responses.
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

/**
 * @swagger
 * /tasks/{taskId}/submit-review:
 *   put:
 *     tags: [Tasks]
 *     summary: Submit an in-progress task to its creator for review
 *     responses:
 *       200: { description: Task submitted for review }
 *       403: { description: Current user cannot submit this task }
 *       409: { description: Task is not in progress }
 * /tasks/{taskId}/request-changes:
 *   put:
 *     tags: [Tasks]
 *     summary: Return a reviewed task to To do with required feedback
 *     responses:
 *       200: { description: Changes requested }
 *       400: { description: A non-empty reason is required }
 *       403: { description: Only the task creator can request changes }
 *       409: { description: Task is not in review }
 */
router.put('/:taskId/submit-review', (req, res, next) => taskController.submitTaskForReview(req, res, next));
router.put('/:taskId/request-changes', (req, res, next) => taskController.requestTaskChanges(req, res, next));

// Approve task (from review to done)
router.put('/:taskId/approve', (req, res, next) => taskController.approveTask(req, res, next));

// Get a specific task by ID
router.get('/:taskId', (req, res, next) => taskController.getTaskById(req, res, next));

// Update a task
/**
 * @swagger
 * /tasks/{taskId}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update a task
 *     responses:
 *       200:
 *         description: Task updated
 *       409:
 *         description: Invalid task status transition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: string, example: INVALID_TASK_TRANSITION }
 *                 currentStatus: { type: string, example: todo }
 *                 requestedStatus: { type: string, example: draft }
 *                 allowedTransitions:
 *                   type: array
 *                   items: { type: string }
 */
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
