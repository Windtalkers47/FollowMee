import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import feedback from '../../services/feedback.service';
import {
  TextField,
  Button,
  Box,
  Grid,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  SxProps,
  Theme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';

export type CustomerFormData = {
  customerId?: string;
  customerName: string;
  customerLastName?: string;
  customerEmail: string;
  customerPhone1?: string;
  customerPhone2?: string;
  customerFacebook?: string;
  customerInstagram?: string;
  customerTikTok?: string;
  customerLine?: string;
  customerX?: string;
  customerAddress?: string;
  customerImageUrl?: string | null;
  customerImageFile?: File | null;
  isActive: boolean;
  removeImage?: boolean; // Flag to indicate image should be removed
};

export type ApiError = {
  field: keyof CustomerFormData;
  message: string;
};

// Define the form validation schema with proper types
// FormValues type should match the schema exactly
type FormValues = {
  customerId?: string;
  customerName: string;
  customerLastName?: string;
  customerEmail: string;
  customerPhone1?: string;
  customerPhone2?: string;
  customerFacebook?: string;
  customerInstagram?: string;
  customerTikTok?: string;
  customerLine?: string;
  customerX?: string;
  customerAddress?: string;
  customerImageUrl?: string | null;
  customerImageFile?: File | null;
  isActive: boolean;
  removeImage?: boolean; // Flag to indicate image should be removed
};

// Define the schema with proper typing
const schema: yup.ObjectSchema<FormValues> = yup.object().shape({
  customerId: yup.string().optional(),
  customerName: yup.string().required('First name is required'),
  customerLastName: yup.string().optional(),
  customerEmail: yup.string().email('Invalid email').required('Email is required'),
  customerPhone1: yup.string().optional(),
  customerPhone2: yup.string().optional(),
  customerFacebook: yup
    .string()
    .test('is-valid-facebook', 'Must be a valid Facebook username or URL', (value) => {
      if (!value) return true; // Allow empty
      // Allow basic usernames (letters, numbers, periods)
      if (/^[a-zA-Z0-9.]{5,}$/.test(value)) return true;
      // Or full URLs
      try {
        new URL(value);
        return value.includes('facebook.com/');
      } catch {
        return false;
      }
    })
    .optional(),
  customerInstagram: yup.string().optional(),
  customerTikTok: yup.string().optional(),
  customerLine: yup.string().optional(),
  customerX: yup.string().optional(),
  customerAddress: yup.string().optional(),
  customerImageUrl: yup.string().nullable().optional(),
  customerImageFile: yup.mixed<File>().nullable().optional(),
  isActive: yup.boolean().default(true).required(),
  removeImage: yup.boolean().optional(),
});

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  initialData?: Partial<CustomerFormData>;
  apiError?: ApiError | null;
  onClearApiError?: () => void;
}

const ImagePreview = styled('div')(({ theme }) => ({
  width: 120,
  height: 120,
  borderRadius: '50%',
  backgroundColor: theme.palette.grey[200],
  position: 'relative',
  margin: '0 auto',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover .image-actions': {
    opacity: 1,
  },
  '& .preview-image': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'block',
  },
}));



const ImageActions = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  opacity: 0,
  transition: 'opacity 0.2s ease-in-out',
}));

const Section: React.FC<{ title: string; children: React.ReactNode; sx?: SxProps<Theme> }> = ({
  title,
  children,
  sx = {},
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      borderRadius: 2,
      mb: 3,
      ...sx,
    }}
  >
    <Typography fontWeight={600} mb={2}>
      {title}
    </Typography>
    {children}
  </Paper>
);

const CustomerForm: React.FC<CustomerFormProps> = ({
  open,
  onClose: handleCloseProp,
  onSubmit,
  initialData = { isActive: true },
  apiError,
  onClearApiError,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.customerImageUrl || null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState(0);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image compression function
  const compressImage = useCallback(async (file: File, maxWidth: number, maxHeight: number, quality: number = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset input to allow selecting the same file again
      fileInputRef.current.click();
    }
  };

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload a valid image file (JPG, PNG, GIF)');
      return;
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      
      // Show loading toast
      feedback.fire({
        title: 'Processing Image...',
        text: 'Please wait while we process your image',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          feedback.showLoading();
        }
      });
      
      // Compress the image
      const compressedBlob = await compressImage(file, 800, 800, 0.7);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      // Create preview
      const previewUrl = URL.createObjectURL(compressedFile);
      
      // Clean up previous preview if it exists
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      
      setImagePreview(previewUrl);
      setSelectedFile(compressedFile);
      setImageKey(prev => prev + 1);

      // Update form values
      if (setValue) {
        setValue('customerImageFile', compressedFile, { shouldValidate: true });
        setValue('customerImageUrl', previewUrl, { shouldValidate: true });
      }

      // Close loading toast and show success
      feedback.close();
      feedback.fire({
        icon: 'success',
        title: 'Image Processed',
        text: 'Your image has been processed successfully!',
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    } catch (error) {
      console.error('Error processing image:', error);
      setUploadError('Failed to process image. Please try another one.');
      feedback.close();
      feedback.fire({
        icon: 'error',
        title: 'Processing Failed',
        text: 'Failed to process image. Please try another one.',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    // Show confirmation dialog before removing image
    const result = await feedback.fire({
      title: 'Remove Image?',
      text: 'Are you sure you want to remove this image? It will be deleted from Cloudinary and database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it!',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
      setSelectedFile(null);
      setImageKey((prev) => prev + 1);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Use setValue from useForm to update form state
      if (setValue) {
        setValue('customerImageUrl', null, { shouldValidate: true });
        setValue('customerImageFile', null, { shouldValidate: true });
        setValue('removeImage', true, { shouldValidate: true }); // Set flag to remove image
      }

      // Show success toast
      feedback.fire({
        icon: 'success',
        title: 'Image Removed',
        text: 'Your image has been removed successfully! Click "Update" to save changes.',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle form submission with proper type safety
  const onSubmitForm = async (formData: FormValues) => {
    // Show loading state for form submission
    feedback.fire({
      title: initialData?.customerId ? 'Updating Customer...' : 'Creating Customer...',
      text: 'Please wait while we process your request',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        feedback.showLoading();
      }
    });

    // Create a new object with all form values
    const submitData: any = {
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      isActive: formData.isActive ?? true,
    };

    // Add optional fields
    const optionalFields = [
      'customerId', 'customerLastName', 'customerPhone1', 'customerPhone2',
      'customerFacebook', 'customerInstagram', 'customerTikTok', 
      'customerLine', 'customerX', 'customerAddress'
    ];
    
    optionalFields.forEach(field => {
      if (formData[field as keyof FormValues]) {
        submitData[field] = formData[field as keyof FormValues];
      }
    });

    // Add removeImage flag if set
    if (formData.removeImage) {
      submitData.removeImage = true;
    }

    // Handle image upload
    if (selectedFile) {
      try {
        setIsProcessingImage(true);
        // Convert to base64
        const base64Image = await fileToBase64(selectedFile);
        submitData.base64Image = base64Image;
      } catch (error) {
        console.error('Error processing image:', error);
        setUploadError('Failed to process the image. Please try again.');
        feedback.close();
        return;
      } finally {
        setIsProcessingImage(false);
      }
    } else if (formData.customerImageUrl && !formData.customerImageUrl.startsWith('blob:')) {
      submitData.customerImageUrl = formData.customerImageUrl;
    } else {
      // Explicitly set customerImageUrl to null when image is removed
      submitData.customerImageUrl = null;
    }

    await onSubmit(submitData);
  };

  const defaultValues = React.useMemo<FormValues>(
    () => ({ 
      customerName: '',
      customerEmail: '',
      isActive: true,
      customerImageUrl: null,
      removeImage: false, // Initialize removeImage flag
      ...initialData 
    }),
    [initialData]
  );

  // Initialize form with proper typing and default values
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      isActive: true,
      customerId: undefined,
      customerLastName: undefined,
      customerPhone1: undefined,
      customerPhone2: undefined,
      customerFacebook: undefined,
      customerInstagram: undefined,
      customerTikTok: undefined,
      customerLine: undefined,
      customerX: undefined,
      customerAddress: undefined,
      customerImageUrl: null,
      customerImageFile: null,
      removeImage: false, // Initialize removeImage flag
    },
  });

  /* ================= Effects ================= */
  React.useEffect(() => {
    if (apiError) {
      setError(apiError.field, {
        type: 'manual',
        message: apiError.message,
      });
    }
  }, [apiError, setError, setValue]);
  

  React.useEffect(() => {
    if (!open) return;
  
    reset(defaultValues);
    setImagePreview(defaultValues.customerImageUrl ?? null);
  }, [open, initialData?.customerId]);
  

  // Alias for onSubmitForm to maintain compatibility
  const handleFormSubmit = onSubmitForm;

  const handleClose = () => {
    handleCloseProp();
  };

  /* ================= UI ================= */
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmitForm)} noValidate>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {initialData?.customerId ? 'Edit Customer' : 'Add New Customer'}
            </Typography>
            <IconButton onClick={handleClose} disabled={isSubmitting}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Image Upload Section */}
          <Section title="Profile Image" sx={{ textAlign: 'center' }}>

          <Stack spacing={2} alignItems="center">
            <ImagePreview>
            {imagePreview ? (
              <div key={imageKey} style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
                border: '2px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={imagePreview}
                  alt="Customer preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onError={(e) => {
                    setUploadError('Failed to load the selected image. Please try another file.');
                    handleRemoveImage();
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.1)'
                }} />
              </div>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
                width="100%"
              >
                <PersonIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
              </Box>
            )}

              {imagePreview && (
                <ImageActions className="image-actions">
                  <IconButton
                    color="primary"
                    onClick={triggerFileSelect}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                    disabled={isUploadingImage || isRemovingImage}
                  >
                    {isUploadingImage ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={handleRemoveImage}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                    disabled={isUploadingImage || isRemovingImage}
                  >
                    {isRemovingImage ? <CircularProgress size={16} /> : <DeleteIcon />}
                  </IconButton>
                </ImageActions>
              )}
            </ImagePreview>

            <Box>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                startIcon={isUploadingImage ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                onClick={triggerFileSelect}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? 'Processing...' : (imagePreview ? 'Change Image' : 'Upload Image')}
              </Button>

              {imagePreview && (
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleRemoveImage}
                  sx={{ ml: 1 }}
                  disabled={isUploadingImage}
                >
                  Remove
                </Button>
              )}
            </Box>

            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                JPG, GIF or PNG. Max size of 5MB
              </Typography>
              {uploadError && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                  {uploadError}
                </Typography>
              )}
            </Box>
          </Stack>

          </Section>
        </DialogContent>
        <Divider />
        <DialogContent sx={{ py: 3 }}>
          {/* ===== Basic Info ===== */}
          <Section title="Basic Information">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="First Name"
                      fullWidth
                      required
                      error={!!errors.customerName}
                      helperText={errors.customerName?.message}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerLastName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Last Name" fullWidth />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Controller
                  name="customerEmail"
                  control={control}
                  render={({ field, fieldState: { error } }) => {
                    // Use the API error if it exists, otherwise use the validation error
                    const emailError = apiError?.field === 'customerEmail' 
                      ? apiError.message 
                      : error?.message;
                    
                    return (
                      <TextField
                        {...field}
                        label="Email"
                        fullWidth
                        required
                        error={!!error || apiError?.field === 'customerEmail'}
                        helperText={emailError}
                        onChange={(e) => {
                          field.onChange(e);
                          // Clear API error when user starts typing
                          if (apiError?.field === 'customerEmail' && onClearApiError) {
                            onClearApiError();
                          }
                        }}
                      />
                    );
                  }}
                />
              </Grid>
            </Grid>
          </Section>

          {/* ===== Contact ===== */}
          <Section title="Contact Details">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerPhone1"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Phone" fullWidth />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerPhone2"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Secondary Phone" fullWidth />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Controller
                  name="customerAddress"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address"
                      fullWidth
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Section>

          {/* ===== Social ===== */}
          <Section title="Social Profiles">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerFacebook"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Facebook"
                      fullWidth
                      error={!!errors.customerFacebook}
                      helperText={errors.customerFacebook?.message}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerInstagram"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Instagram" fullWidth />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerTikTok"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="TikTok" fullWidth />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerLine"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="LINE ID" fullWidth />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerX"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="X (Twitter)" fullWidth />
                  )}
                />
              </Grid>
            </Grid>
          </Section>

          {/* ===== Status ===== */}
          <Section title="Status">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Active customer"
                />
              )}
            />
          </Section>
        </DialogContent>

        {/* ===== Actions ===== */}
        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {initialData?.customerId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CustomerForm;
