export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    status?: number;
  };
  success: boolean;
}

export interface LoginResponse {
  user: {
    userId: number;
    userName: string;
    userEmail: string;
    userRole?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Add more API response types as needed
