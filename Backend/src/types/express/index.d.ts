import { User } from '../../entities/User';
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      users?: {
        userId: number;
        email: string;
      };
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}
