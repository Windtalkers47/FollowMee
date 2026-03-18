import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'followmee/customers'
): Promise<string> => {
  try {
    // Convert buffer to base64
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: 'auto',
      format: 'png', // Force PNG format for better canvas compatibility
      quality: 'auto',
      fetch_format: 'auto',
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Upload a base64 image to Cloudinary
 */
export const uploadBase64Image = async (
  base64: string, 
  folder: string = 'followmee/customers'
): Promise<string> => {
  try {
    // Check if the base64 string has the data URI prefix
    const dataUriRegex = /^data:image\/([a-zA-Z+]+);base64,([\s\S]+)$/;
    const matches = base64.match(dataUriRegex);
    
    if (!matches) {
      throw new Error('Invalid base64 image data');
    }
    
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: 'auto',
      format: 'png', // Force PNG format for better canvas compatibility
      quality: 'auto',
      fetch_format: 'auto',
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading base64 image to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete an image from Cloudinary by its URL
 */
export const deleteFromCloudinary = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract public ID from URL
    const urlParts = imageUrl.split('/');
    const folderAndFile = urlParts.slice(urlParts.indexOf('upload') + 2).join('/');
    const publicId = folderAndFile.replace(/\.[^/.]+$/, ''); // Remove file extension

    if (!publicId) {
      throw new Error('Invalid image URL');
    }

    // Delete the resource
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

export default cloudinary;
