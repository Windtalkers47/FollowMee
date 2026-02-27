// Export all API services
export * from './auth.api';
export * from './user.api';
export * from './customer.api';
export * from './task.api';

export { default as authApi } from './auth.api';
export { default as userApi } from './user.api';
export { default as customerApi } from './customer.api';
export { taskApi, commentApi, likeApi } from './task.api';
