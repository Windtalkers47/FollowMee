import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

// Allowed file types
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

// Configure multer to store files in memory (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Configure multer with memory storage, file filter, and size limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
  },
});

// Generate a unique filename with extension
export const generateUniqueFileName = (originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase();
  return `${uuidv4()}${ext}`;
};

// Validate the uploaded file
export const validateImageFile = (file?: Express.Multer.File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file uploaded' };
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.' 
    };
  }

  if (file.size > maxFileSize) {
    return { 
      isValid: false, 
      error: 'File size too large. Maximum size is 5MB.' 
    };
  }

  return { isValid: true };
};
