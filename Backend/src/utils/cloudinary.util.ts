import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
});

export class CloudinaryUtil {
  static async uploadImage(buffer: Buffer, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'followmee/tasks',
          public_id: `${Date.now()}-${filename}`,
          format: 'jpg',
          quality: 'auto:good',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        }
      );

      // Convert buffer to stream
      const readable = new Readable();
      readable._read = () => {};
      readable.push(buffer);
      readable.push(null);

      readable.pipe(uploadStream);
    });
  }

  static async uploadMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map(file => 
      this.uploadImage(file.buffer, file.originalname)
    );
    
    return Promise.all(uploadPromises);
  }

  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from URL
      const publicId = imageUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`followmee/tasks/${publicId}`);
      }
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
    }
  }
}
