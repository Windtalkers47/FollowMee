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
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isGif = buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isJpeg && !isPng && !isGif && !isWebp) throw Object.assign(new Error('File content is not a supported image'), { statusCode: 400, code: 'UNSUPPORTED_IMAGE_CONTENT' });
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100);
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'followmee/tasks',
          public_id: `${Date.now()}-${safeFilename}`,
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
      const urlParts = imageUrl.split('/');
      const filename = urlParts.pop()?.split('.')[0];
      if (filename) {
        // Check if it's a customer image, user image, comment image, or task image
        if (urlParts.includes('customers')) {
          await cloudinary.uploader.destroy(`followmee/customers/${filename}`);
        } else if (urlParts.includes('users')) {
          await cloudinary.uploader.destroy(`followmee/users/${filename}`);
        } else if (urlParts.includes('comments')) {
          await cloudinary.uploader.destroy(`followmee/comments/${filename}`);
        } else {
          // Default to tasks folder
          await cloudinary.uploader.destroy(`followmee/tasks/${filename}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
    }
  }
}
