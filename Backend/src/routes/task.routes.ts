import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { TaskService } from '../services/task.service';
import { TaskRepository } from '../repositories/task.repository';
import { authenticateToken } from '../middleware/auth.middleware';
import AppDataSource from '../config/database';
import { Task } from '../entities/Task';

const router = Router();

// Initialize dependencies
const taskRepository = new TaskRepository();
const taskService = new TaskService(AppDataSource.getRepository(Task));
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

// Get a specific task by ID
router.get('/:taskId', (req, res, next) => taskController.getTaskById(req, res, next));

// Update a task
router.put('/:taskId', (req, res, next) => taskController.updateTask(req, res, next));

// Delete a task
router.delete('/:taskId', (req, res, next) => taskController.deleteTask(req, res, next));

export default router;
