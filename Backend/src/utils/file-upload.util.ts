import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_COUNT = 6;

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILE_COUNT,
    fields: 30,
    parts: MAX_FILE_COUNT + 30,
  }
});

// For single file upload
export const uploadSingle = upload.single('image');

// For multiple files upload
export const uploadMultiple = upload.array('images', MAX_FILE_COUNT);
