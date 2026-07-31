import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FollowMee API Documentation',
      version: '1.0.0',
      description: `
# FollowMee API

A comprehensive social media management platform API.

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Response Format
All responses follow a standard format:
\`\`\`json
{
  "data": { ... },
  "message": "Success message"
}
\`\`\`

## Error Format
Errors are returned in the following format:
\`\`\`json
{
  "message": "Error message",
  "errors": [ ... ]
}
\`\`\`
      `,
      contact: {
        name: 'FollowMee Support',
        email: 'support@followmee.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'https://api.followmee.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token stored in HTTP-only cookie',
        },
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            userId: { type: 'integer', description: 'User ID' },
            userName: { type: 'string', description: 'First name' },
            userLastName: { type: 'string', description: 'Last name' },
            userEmail: { type: 'string', format: 'email', description: 'Email address' },
            userPhone1: { type: 'string', description: 'Primary phone number' },
            userPhone2: { type: 'string', description: 'Secondary phone number' },
            userImageUrl: { type: 'string', format: 'uri', description: 'Profile image URL' },
            roles: {
              type: 'array',
              items: { type: 'string' },
              description: 'User roles',
            },
            isActive: { type: 'boolean', description: 'Account status' },
            createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          },
        },
        CreateUser: {
          type: 'object',
          required: ['userName', 'userLastName', 'userEmail', 'userPassword'],
          properties: {
            userName: { type: 'string', minLength: 1, maxLength: 50 },
            userLastName: { type: 'string', minLength: 1, maxLength: 50 },
            userEmail: { type: 'string', format: 'email' },
            userPassword: { type: 'string', minLength: 6, maxLength: 100 },
            userPhone1: { type: 'string', maxLength: 20 },
            userPhone2: { type: 'string', maxLength: 20 },
          },
        },
        UpdateUser: {
          type: 'object',
          properties: {
            userName: { type: 'string', minLength: 1, maxLength: 50 },
            userLastName: { type: 'string', minLength: 1, maxLength: 50 },
            userEmail: { type: 'string', format: 'email' },
            userPassword: { type: 'string', minLength: 6, maxLength: 100 },
            userPhone1: { type: 'string', maxLength: 20 },
            userPhone2: { type: 'string', maxLength: 20 },
            userImageUrl: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean' },
          },
        },

        // Customer schemas
        Customer: {
          type: 'object',
          properties: {
            customerId: { type: 'integer', description: 'Customer ID' },
            customerName: { type: 'string', description: 'Customer name' },
            customerEmail: { type: 'string', format: 'email', description: 'Email address' },
            customerPhone: { type: 'string', description: 'Phone number' },
            customerLineId: { type: 'string', description: 'LINE ID' },
            customerFacebook: { type: 'string', description: 'Facebook profile' },
            customerInstagram: { type: 'string', description: 'Instagram profile' },
            customerTwitter: { type: 'string', description: 'Twitter profile' },
            customerTiktok: { type: 'string', description: 'TikTok profile' },
            customerYoutube: { type: 'string', description: 'YouTube channel' },
            customerAddress: { type: 'string', description: 'Address' },
            customerNote: { type: 'string', description: 'Notes' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateCustomer: {
          type: 'object',
          required: ['customerName'],
          properties: {
            customerName: { type: 'string', minLength: 1, maxLength: 100 },
            customerEmail: { type: 'string', format: 'email' },
            customerPhone: { type: 'string', maxLength: 20 },
            customerLineId: { type: 'string' },
            customerFacebook: { type: 'string' },
            customerInstagram: { type: 'string' },
            customerTwitter: { type: 'string' },
            customerTiktok: { type: 'string' },
            customerYoutube: { type: 'string' },
            customerAddress: { type: 'string' },
            customerNote: { type: 'string' },
          },
        },

        // Task schemas
        Task: {
          type: 'object',
          properties: {
            taskId: { type: 'string', format: 'uuid', description: 'Task ID' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            status: { 
              type: 'string', 
              enum: ['draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'],
              description: 'Task status',
            },
            startDate: { type: 'string', format: 'date-time', description: 'Start date' },
            endDate: { type: 'string', format: 'date-time', description: 'End date' },
            dueDate: { type: 'string', format: 'date-time', description: 'Due date' },
            assignedTo: { type: 'integer', description: 'Assigned user ID' },
            createdBy: { type: 'integer', description: 'Creator user ID' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTask: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 2000 },
            status: { 
              type: 'string', 
              enum: ['draft', 'todo'],
              description: 'Draft is private to the creator. To do requires assignedTo.',
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time' },
            assignedTo: { type: 'integer' },
            images: {
              type: 'array',
              maxItems: 10,
              items: {
                type: 'object',
                properties: {
                  imageUrl: { type: 'string', format: 'uri' },
                  imageOrder: { type: 'integer' },
                },
              },
            },
          },
        },

        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'integer' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['userName', 'userLastName', 'userEmail', 'userPassword'],
          properties: {
            userName: { type: 'string' },
            userLastName: { type: 'string' },
            userEmail: { type: 'string', format: 'email' },
            userPassword: { type: 'string', minLength: 6 },
          },
        },

        // Error schemas
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Customers', description: 'Customer management endpoints' },
      { name: 'Tasks', description: 'Task management endpoints' },
      { name: 'Notifications', description: 'Notification endpoints' },
      { name: 'Health', description: 'Health check endpoints' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/dtos/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
