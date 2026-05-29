import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth handlers
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        data: {
          user: {
            userId: 1,
            userName: 'Test',
            userLastName: 'User',
            userEmail: 'test@example.com',
            roles: ['User'],
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
        },
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      data: {
        userId: 1,
        userName: 'Test',
        userLastName: 'User',
        userEmail: 'test@example.com',
        roles: ['User'],
      },
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // Task handlers
  http.get('/api/tasks', () => {
    return HttpResponse.json({
      data: [
        {
          taskId: 1,
          taskTitle: 'Test Task 1',
          taskDescription: 'Test Description 1',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date().toISOString(),
        },
        {
          taskId: 2,
          taskTitle: 'Test Task 2',
          taskDescription: 'Test Description 2',
          status: 'completed',
          priority: 'high',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }),

  http.post('/api/tasks', async () => {
    return HttpResponse.json({
      data: {
        taskId: 3,
        taskTitle: 'New Task',
        taskDescription: 'New Description',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
      },
    });
  }),

  // Customer handlers
  http.get('/api/customers', () => {
    return HttpResponse.json({
      data: [
        {
          customerId: 1,
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '0812345678',
        },
      ],
    });
  }),
];