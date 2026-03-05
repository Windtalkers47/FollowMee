import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Alert,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { TaskImage } from '../../api/task.api';
import { taskApi } from '../../api/task.api';
import ErrorDialog from './ErrorDialog';

interface ImageUploadProps {
  images: TaskImage[];
  onImagesChange: (images: TaskImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    suggestions?: string[];
    fileName?: string;
  }>({ open: false, title: '', message: '', type: 'error' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled || images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const newImages: TaskImage[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((i / files.length) * 100);
        
        // Check file size before upload
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          setErrorDialog({
            open: true,
            title: 'File Too Large',
            message: `File "${file.name}" is too large. Maximum file size is 5MB.`,
            type: 'warning',
            suggestions: [
              'Resize the image to be smaller than 5MB',
              'Use an online image compressor like TinyPNG',
              'Try uploading a different image',
              'Convert to JPEG format for smaller file size'
            ],
            fileName: file.name
          });
          continue;
        }
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setErrorDialog({
            open: true,
            title: 'Unsupported Format',
            message: `File "${file.name}" is not a supported image format.`,
            type: 'warning',
            suggestions: [
              'Convert the file to JPG, PNG, GIF, or WebP format',
              'Use an online image converter',
              'Take a screenshot and save as supported format',
              'Use a different image file'
            ],
            fileName: file.name
          });
          continue;
        }
        
        const result = await taskApi.uploadImage(file);
        const newImage: TaskImage = {
          imageId: Date.now() + i,
          taskId: '',
          imageUrl: result.imageUrl,
          imageOrder: images.length + i,
          uploadedBy: 0, // This would come from user context
          createdAt: new Date().toISOString(),
          isActive: true
        };
        
        // Check for duplicate URLs
        const isDuplicate = images.some(img => img.imageUrl === result.imageUrl);
        if (!isDuplicate) {
          newImages.push(newImage);
        }
      }
      
      onImagesChange([...images, ...newImages]);
      setUploadProgress(100);
    } catch (err: any) {
      // Show error dialog with specific information
      let errorTitle = 'Upload Failed';
      let errorMessage = 'Upload failed. Please check your file and try again.';
      let errorType: 'error' | 'warning' | 'info' = 'error';
      let suggestions: string[] = [];
      let fileName = '';

      // Get file name from the upload attempt
      if (files && files.length > 0) {
        fileName = files[0].name;
      }

      // Provide specific error messages based on error type
      if (err?.response?.status === 413) {
        errorTitle = 'File Too Large';
        errorMessage = `File "${fileName}" is too large. Maximum file size is 5MB.`;
        errorType = 'warning';
        suggestions = [
          'Resize the image to be smaller than 5MB',
          'Use an online image compressor like TinyPNG',
          'Try uploading a different image',
          'Convert to JPEG format for smaller file size'
        ];
      } else if (err?.response?.status === 415) {
        errorTitle = 'Unsupported Format';
        errorMessage = `File "${fileName}" is not a supported image format.`;
        errorType = 'warning';
        suggestions = [
          'Convert the file to JPG, PNG, GIF, or WebP format',
          'Use an online image converter',
          'Take a screenshot and save as supported format',
          'Use a different image file'
        ];
      } else if (err?.response?.status === 429) {
        errorTitle = 'Too Many Attempts';
        errorMessage = 'Too many upload attempts. Please wait a moment and try again.';
        errorType = 'warning';
        suggestions = [
          'Wait a few minutes before trying again',
          'Upload fewer images at once',
          'Try uploading one image at a time'
        ];
      } else if (err?.response?.status >= 500) {
        errorTitle = 'Server Error';
        errorMessage = 'Server error during upload. Please check your internet connection and try again.';
        errorType = 'error';
        suggestions = [
          'Check your internet connection',
          'Wait a few minutes and try again',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ];
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setErrorDialog({
        open: true,
        title: errorTitle,
        message: errorMessage,
        type: errorType,
        suggestions,
        fileName
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [disabled, images.length, maxImages, onImagesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileSelect(event.target.files);
    }
  };

  const handleUrlAdd = async () => {
    if (!imageUrl.trim()) return;

    // Check for duplicate URLs
    const isDuplicate = images.some(img => img.imageUrl === imageUrl.trim());
    if (isDuplicate) {
      setErrorDialog({
        open: true,
        title: 'Duplicate Image',
        message: 'This image URL already exists in your task.',
        type: 'warning',
        suggestions: [
          'Use a different image URL',
          'Remove the existing image first',
          'Check if you already added this image',
          'Try a different image source'
        ]
      });
      return;
    }

    try {
      // Validate the URL using backend API (avoids CORS issues)
      const validation = await taskApi.validateImageUrl(imageUrl.trim());
      
      if (!validation.isValid) {
        setErrorDialog({
          open: true,
          title: 'Invalid Image URL',
          message: 'The URL does not point to a valid image or the image cannot be accessed.',
          type: 'error',
          suggestions: [
            'Check if the URL is correct and accessible',
            'Try opening the URL in your browser first',
            'Use a different image URL',
            'Make sure the image URL is publicly accessible'
          ]
        });
        return;
      }

      const newImage: TaskImage = {
        imageId: Date.now(),
        taskId: '',
        imageUrl: imageUrl.trim(),
        imageOrder: images.length,
        uploadedBy: 0,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      onImagesChange([...images, newImage]);
      setImageUrl('');
      setUrlDialogOpen(false);
    } catch (error: any) {
      // Handle specific error responses from backend
      let errorTitle = 'URL Validation Failed';
      let errorMessage = 'Unable to validate the image URL. Please check the URL and try again.';
      let errorType: 'error' | 'warning' | 'info' = 'error';
      let suggestions: string[] = [];

      // Check if we have a response with data
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        switch (errorData.error) {
          case 'INVALID_URL':
            errorTitle = 'Invalid Image URL';
            errorMessage = errorData.message || 'The URL does not point to a valid image.';
            errorType = 'error';
            suggestions = [
              'Check if the URL is correct and accessible',
              'Try opening the URL in your browser first',
              'Use a different image URL',
              'Make sure the image URL is publicly accessible'
            ];
            break;
            
          case 'UNSUPPORTED_FORMAT':
            errorTitle = 'Unsupported Format';
            errorMessage = errorData.message || 'The URL points to an unsupported image format.';
            errorType = 'warning';
            suggestions = [
              'Use URLs that point to JPG, PNG, GIF, or WebP images',
              'Convert the image to a supported format',
              'Use a different image source',
              'Upload the image directly instead of using URL'
            ];
            break;
            
          case 'FILE_TOO_LARGE':
            errorTitle = 'File Too Large';
            errorMessage = errorData.message || 'The image exceeds the 5MB limit.';
            errorType = 'warning';
            suggestions = [
              'Use a smaller image (under 5MB)',
              'Compress the image before uploading',
              'Use an online image compressor like TinyPNG',
              'Convert to JPEG format for smaller file size',
              'Upload the image directly after resizing'
            ];
            break;
            
          default:
            errorTitle = 'URL Validation Failed';
            errorMessage = errorData.message || 'Unable to validate the image URL.';
            errorType = 'error';
            suggestions = [
              'Check if the URL is correct and accessible',
              'Make sure you have an internet connection',
              'Try opening the URL in your browser',
              'Use a different image URL',
              'Upload the image directly instead'
            ];
        }
      } else {
        // Fallback for other types of errors
        errorMessage = error?.message || 'Unable to validate the image URL. Please check the URL and try again.';
        suggestions = [
          'Check if the URL is correct and accessible',
          'Make sure you have an internet connection',
          'Try opening the URL in your browser',
          'Use a different image URL',
          'Upload the image directly instead'
        ];
      }
      
      setErrorDialog({
        open: true,
        title: errorTitle,
        message: errorMessage,
        type: errorType,
        suggestions
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Task Images ({images.length}/{maxImages})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Upload Area */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          border: `2px dashed ${dragActive ? 'primary.main' : 'grey.300'}`,
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease-in-out'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          {dragActive ? 'Drop images here' : 'Drag & drop images here'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to browse files
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={disabled || images.length >= maxImages}
          >
            Choose Files
          </Button>

          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={(e) => {
              e.stopPropagation();
              setUrlDialogOpen(true);
            }}
            disabled={disabled || images.length >= maxImages}
          >
            Add URL
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          Supported formats: JPG, PNG, GIF, WebP. Maximum file size: 5MB per image.
        </Typography>
      </Paper>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" sx={{ mt: 0.5 }}>
            Uploading... {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Uploaded Images
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 2
            }}
          >
            {images.map((image, index) => (
              <Paper
                key={image.imageId}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box
                  component="img"
                  src={image.imageUrl}
                  alt={`Image ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: 150,
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(image.imageUrl, '_blank')}
                />
                
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                  }}
                  onClick={() => handleRemoveImage(index)}
                  disabled={disabled}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* URL Dialog */}
      <Dialog open={urlDialogOpen} onClose={() => setUrlDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Add Image URL</Typography>
            <IconButton onClick={() => setUrlDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <TextField
            fullWidth
            label="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            autoFocus
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setUrlDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUrlAdd}
            variant="contained"
            disabled={!imageUrl.trim()}
          >
            Add Image
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        title={errorDialog.title}
        message={errorDialog.message}
        type={errorDialog.type}
        suggestions={errorDialog.suggestions}
        fileName={errorDialog.fileName}
      />
    </Box>
  );
};

export default ImageUpload;
