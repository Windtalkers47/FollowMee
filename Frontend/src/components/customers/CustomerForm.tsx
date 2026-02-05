import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
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
});

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  initialData?: Partial<CustomerFormData>;
  apiError?: ApiError | null;
}

const ImagePreview = styled('div')(({ theme }) => ({
  width: 120,
  height: 120,
  borderRadius: '50%',
  backgroundColor: theme.palette.grey[200],
  position: 'relative',
  margin: '0 auto',
  overflow: 'hidden',
  '&:hover .image-actions': {
    opacity: 1,
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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.customerImageUrl || null
  );

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Reset form when initialData changes
  React.useEffect(() => {
    if (open) {
      setImagePreview(initialData?.customerImageUrl || null);
    }
  }, [open, initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('File must be an image');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File size must be less than 5MB');
      return;
    }
  
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setSelectedFile(file);
    setValue('customerImageFile', file, { shouldValidate: true });
  };
  

  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setValue('customerImageUrl', null, { shouldValidate: true });
    setValue('customerImageFile', null, { shouldValidate: true });
  };

  // Handle form submission with proper type safety
  const onSubmitForm = async (formData: FormValues) => {
    try {
      // Create a new object with only the fields that have values
      const submitData: CustomerFormData = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        isActive: formData.isActive ?? true,
        customerImageUrl: formData.customerImageUrl ?? null,
      };

      // Add optional fields only if they have values
      if (formData.customerId) submitData.customerId = formData.customerId;
      if (formData.customerLastName) submitData.customerLastName = formData.customerLastName;
      if (formData.customerPhone1) submitData.customerPhone1 = formData.customerPhone1;
      if (formData.customerPhone2) submitData.customerPhone2 = formData.customerPhone2;
      if (formData.customerFacebook) submitData.customerFacebook = formData.customerFacebook;
      if (formData.customerInstagram) submitData.customerInstagram = formData.customerInstagram;
      if (formData.customerTikTok) submitData.customerTikTok = formData.customerTikTok;
      if (formData.customerLine) submitData.customerLine = formData.customerLine;
      if (formData.customerX) submitData.customerX = formData.customerX;
      if (formData.customerAddress) submitData.customerAddress = formData.customerAddress;

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
      // You might want to show an error message to the user here
    }
  };
  const defaultValues = React.useMemo<FormValues>(
    () => ({ 
      customerName: '',
      customerEmail: '',
      isActive: true,
      customerImageUrl: null,
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
    },
  });

  /* ================= Effects ================= */
  React.useEffect(() => {
    if (apiError) {
      setError(apiError.field, {
        type: 'manual',
        message: apiError.message,
      });
  
      setTimeout(() => setValue(apiError.field, '', { shouldValidate: true }), 100);
    }
  }, [apiError, setError, setValue]);
  

  React.useEffect(() => {
    if (!open) return;
  
    reset(defaultValues);
    setImagePreview(defaultValues.customerImageUrl ?? null);
  }, [open, initialData?.customerId]);
  

  const handleFormSubmit = async (formValues: FormValues) => {
    try {
      // Convert FormValues to CustomerFormData
      const formData: CustomerFormData = {
        customerId: formValues.customerId,
        customerName: formValues.customerName,
        customerLastName: formValues.customerLastName,
        customerEmail: formValues.customerEmail,
        customerPhone1: formValues.customerPhone1,
        customerPhone2: formValues.customerPhone2,
        customerFacebook: formValues.customerFacebook,
        customerInstagram: formValues.customerInstagram,
        customerTikTok: formValues.customerTikTok,
        customerLine: formValues.customerLine,
        customerX: formValues.customerX,
        customerAddress: formValues.customerAddress,
        customerImageUrl: formValues.customerImageUrl,
        isActive: formValues.isActive,
      };
      
      await onSubmit({
        ...formData,
        customerImageFile: selectedFile, // upload separately
      });
      
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleClose = () => {
    handleCloseProp();
  };

  /* ================= UI ================= */
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit((data) => handleFormSubmit(data))} noValidate>
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
                <img
                  src={imagePreview}
                  alt="Customer preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
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
                  >
                    <CloudUploadIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={handleRemoveImage}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
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
                startIcon={<CloudUploadIcon />}
                onClick={triggerFileSelect}
              >
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </Button>

              {imagePreview && (
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleRemoveImage}
                  sx={{ ml: 1 }}
                >
                  Remove
                </Button>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary">
              JPG, GIF or PNG. Max size of 5MB
            </Typography>
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
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      fullWidth
                      required
                      error={!!errors.customerEmail}
                      helperText={errors.customerEmail?.message}
                    />
                  )}
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
