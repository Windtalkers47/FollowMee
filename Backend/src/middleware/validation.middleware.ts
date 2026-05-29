import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Custom validation error handler middleware
 * Processes express-validator results and returns formatted errors
 * Use this middleware AFTER your validation chains
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: (err as any).path,
        message: err.msg,
        value: (err as any).value,
      })),
    });
    return;
  }
  
  next();
};

// ==================== Auth Validators ====================

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  validate,
];

export const registerValidator = [
  body('userName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\u0E00-\u0E7F\s]+$/)
    .withMessage('First name can only contain letters (English or Thai)'),
  
  body('userLastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\u0E00-\u0E7F\s]+$/)
    .withMessage('Last name can only contain letters (English or Thai)'),
  
  body('userEmail')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('userPassword')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters'),
  
  validate,
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  validate,
];

export const resetPasswordValidator = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters'),
  
  validate,
];

// ==================== User Validators ====================

export const createUserValidator = [
  body('userName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('userLastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('userEmail')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('userPassword')
    .optional()
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters'),
  
  body('userPhone1')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  
  body('userPhone2')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  validate,
];

export const updateUserValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  
  body('userName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('userLastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('userEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('userPassword')
    .optional()
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters'),
  
  body('userPhone1')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),
  
  body('userPhone2')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),
  
  body('userImageUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  validate,
];

export const userIdValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  
  validate,
];

// ==================== Customer Validators ====================

export const createCustomerValidator = [
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters'),
  
  body('customerEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('customerPhone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  
  body('customerLineId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('LINE ID must not exceed 100 characters'),
  
  body('customerFacebook')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Facebook profile must not exceed 200 characters'),
  
  body('customerInstagram')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Instagram profile must not exceed 100 characters'),
  
  body('customerTwitter')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Twitter profile must not exceed 100 characters'),
  
  body('customerTiktok')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('TikTok profile must not exceed 100 characters'),
  
  body('customerYoutube')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('YouTube channel must not exceed 200 characters'),
  
  body('customerAddress')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('customerNote')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  
  validate,
];

export const updateCustomerValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Customer ID is required')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  
  body('customerName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters'),
  
  body('customerEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('customerPhone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),
  
  body('customerLineId')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  
  body('customerFacebook')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  
  body('customerInstagram')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  
  body('customerTwitter')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  
  body('customerTiktok')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  
  body('customerYoutube')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  
  body('customerAddress')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  
  body('customerNote')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  
  validate,
];

export const customerIdValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Customer ID is required')
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  
  validate,
];

// ==================== Task Validators ====================

export const createTaskValidator = [
  body('taskTitle')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  
  body('taskDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Task description must not exceed 2000 characters'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be one of: pending, in_progress, completed, cancelled'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.body.startDate && value && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  
  body('assignedTo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Assigned user ID must be a positive integer'),
  
  body('customerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  
  validate,
];

export const updateTaskValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Task ID is required')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer'),
  
  body('taskTitle')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  
  body('taskDescription')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Task description must not exceed 2000 characters'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be one of: pending, in_progress, completed, cancelled'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),
  
  body('assignedTo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Assigned user ID must be a positive integer'),
  
  body('customerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Customer ID must be a positive integer'),
  
  validate,
];

export const taskIdValidator = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Task ID is required')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer'),
  
  validate,
];

// ==================== Comment Validators ====================

export const createCommentValidator = [
  param('taskId')
    .trim()
    .notEmpty()
    .withMessage('Task ID is required')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer'),
  
  body('commentText')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  
  body('parentCommentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent comment ID must be a positive integer'),
  
  validate,
];

export const commentIdValidator = [
  param('commentId')
    .trim()
    .notEmpty()
    .withMessage('Comment ID is required')
    .isInt({ min: 1 })
    .withMessage('Comment ID must be a positive integer'),
  
  validate,
];

// ==================== Generic Validators ====================

export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .trim()
    .matches(/^[a-zA-Z]+$/)
    .withMessage('Sort field must contain only letters'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc'),
  
  validate,
];

export const searchValidator = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  validate,
];