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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SxProps,
  Theme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/user.api';
import ImageCropEditor from '../ImageCropEditor';

export type CustomerFormData = {
  customerId?: string;
  assignedTo?: number;
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
  imageCrop?: { x: number; y: number; zoom: number; rotation: number } | null;
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
  assignedTo?: number;
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
  imageCrop?: { x: number; y: number; zoom: number; rotation: number } | null;
  isActive: boolean;
  removeImage?: boolean; // Flag to indicate image should be removed
};

// Define the schema with proper typing
const schema: yup.ObjectSchema<FormValues> = yup.object().shape({
  customerId: yup.string().optional(),
  assignedTo: yup.number().positive().integer().optional(),
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
  imageCrop: yup.object({ x: yup.number().required(), y: yup.number().required(), zoom: yup.number().required(), rotation: yup.number().required() }).nullable().optional(),
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
  canReassign?: boolean;
}

// Keep the add-form defaults referentially stable. A fresh object here would
// make `defaultValues` change on every render, causing the effect below to
// reset the form while the user is typing.
const EMPTY_CUSTOMER_DATA: Partial<CustomerFormData> = { isActive: true };

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
  initialData = EMPTY_CUSTOMER_DATA,
  apiError,
  onClearApiError,
  canReassign = true,
}) => {
  const { t } = useUserPreferences();
  const { data: assignableUsers = [] } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: userApi.getAssignableUsers,
    enabled: open,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.customerImageUrl || null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState(0);
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError(t('customers.form.imageInvalid'));
      return;
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError(t('customers.form.imageTooLarge'));
      return;
    }

    try {
      setIsUploadingImage(true);
      
      // Show loading toast
      feedback.fire({
        title: t('customers.form.processingImage'),
        text: t('customers.form.processingImageHelp'),
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
      });
      
      // Compress the image
      const compressedBlob = await compressImage(file, 800, 800, 0.7);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: file.lastModified,
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
        title: t('customers.form.imageProcessed'),
        text: t('customers.form.imageProcessedHelp'),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      setUploadError(t('customers.form.imageProcessFailed'));
      feedback.close();
      feedback.fire({
        icon: 'error',
        title: t('customers.form.imageProcessFailedTitle'),
        text: t('customers.form.imageProcessFailed'),
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    // Show confirmation dialog before removing image
    const result = await feedback.fire({
      title: t('customers.form.removeImageTitle'),
      text: t('customers.form.removeImageQuestion'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('customers.form.removeImageConfirm'),
      cancelButtonText: t('common.cancel'),
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
        title: t('customers.form.imageRemoved'),
        text: t('customers.form.imageRemovedHelp'),
        timer: 2000,
        showConfirmButton: false,
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
      title: initialData?.customerId ? t('customers.form.updating') : t('customers.form.creating'),
      text: t('customers.form.submittingHelp'),
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    // Create a new object with all form values
    const submitData: CustomerFormData & { base64Image?: string } = {
      ...formData,
      isActive: formData.isActive ?? true,
    };

    // Add removeImage flag if set
    if (formData.removeImage) {
      submitData.removeImage = true;
    }

    // Handle image upload
    if (selectedFile) {
      try {
        // Convert to base64
        const base64Image = await fileToBase64(selectedFile);
        submitData.base64Image = base64Image;
      } catch (error) {
        console.error('Error processing image:', error);
        setUploadError(t('customers.form.imageProcessFailed'));
        feedback.close();
        return;
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
      imageCrop: null,
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
      assignedTo: undefined,
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
    // Resetting the preview follows the external dialog/open state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImagePreview(defaultValues.customerImageUrl ?? null);
  }, [defaultValues, open, reset]);

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
              {initialData?.customerId ? t('customers.form.editTitle') : t('customers.form.addTitle')}
            </Typography>
            <IconButton onClick={handleClose} disabled={isSubmitting}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Image Upload Section */}
          <Section title={t('customers.form.profileImage')} sx={{ textAlign: 'center' }}>

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
                  alt={t('customers.form.previewAlt')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onError={() => {
                    setUploadError(t('customers.form.imageLoadFailed'));
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
                    aria-label={t('customers.form.changeImage')}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={handleRemoveImage}
                    aria-label={t('customers.form.removeImage')}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                    disabled={isUploadingImage}
                  >
                    <DeleteIcon />
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
                {isUploadingImage ? t('customers.form.processing') : (imagePreview ? t('customers.form.changeImage') : t('customers.form.uploadImage'))}
              </Button>

              {imagePreview && (
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleRemoveImage}
                  sx={{ ml: 1 }}
                  disabled={isUploadingImage}
                >
                  {t('customers.form.removeImage')}
                </Button>
              )}
            </Box>
            {imagePreview && <Controller name="imageCrop" control={control} render={({ field }) => <Box width="100%" maxWidth={420}><ImageCropEditor src={imagePreview} value={field.value} onChange={field.onChange} /></Box>} />}

            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('customers.form.imageHelp')}
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
          <Section title={t('customers.form.basicInfo')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('common.firstName')}
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
                    <TextField {...field} label={t('common.lastName')} fullWidth />
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
                        label={t('common.email')}
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

          <Section title={t('task.form.assignedTo')}>
            <Controller
              name="assignedTo"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth disabled={Boolean(initialData?.customerId) && !canReassign}>
                  <InputLabel id="customer-assignee-label">{t('task.form.assignedTo')}</InputLabel>
                  <Select
                    {...field}
                    labelId="customer-assignee-label"
                    label={t('task.form.assignedTo')}
                    value={field.value || ''}
                    onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : undefined)}
                  >
                    <MenuItem value="">{t('task.form.unassigned')}</MenuItem>
                    {assignableUsers.map(user => (
                      <MenuItem key={user.userId} value={user.userId}>{user.userName} {user.userLastName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Section>

          {/* ===== Contact ===== */}
          <Section title={t('customers.form.contactDetails')}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerPhone1"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label={t('customers.form.phone')} fullWidth />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Controller
                  name="customerPhone2"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label={t('customers.form.secondaryPhone')} fullWidth />
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
                      label={t('customers.form.address')}
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
          <Section title={t('customers.form.socialProfiles')}>
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
          <Section title={t('customers.form.status')}>
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
                  label={t('customers.form.activeCustomer')}
                />
              )}
            />
          </Section>
        </DialogContent>

        {/* ===== Actions ===== */}
        <DialogActions>
          <Button onClick={handleClose} disabled={isSubmitting}>
            {t('common.cancel')}
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
