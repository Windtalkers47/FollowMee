import { User } from '../../entities/User';

declare global {
  namespace Express {
    interface Request {
      users?: {
        userId: number;
        email: string;
      };
    }
  }
}
