import React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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
  isActive: boolean;
};

export type ApiError = {
  field: keyof CustomerFormData;
  message: string;
};

const schema: yup.ObjectSchema<CustomerFormData> = yup.object().shape({
  customerId: yup.string().optional(),
  customerName: yup.string().required('Name is required'),
  customerLastName: yup.string().optional(),
  customerEmail: yup.string().email('Invalid email').required('Email is required'),
  customerPhone1: yup.string().optional(),
  customerPhone2: yup.string().optional(),
  customerFacebook: yup.string().url('Must be a valid URL').optional(),
  customerInstagram: yup.string().optional(),
  customerTikTok: yup.string().optional(),
  customerLine: yup.string().optional(),
  customerX: yup.string().optional(),
  isActive: yup.boolean().required(),
});

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  initialData?: Partial<CustomerFormData>;
  apiError?: ApiError | null;
}


const CustomerForm: React.FC<CustomerFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData = { isActive: true },
  apiError = null,
}) => {
  const defaultValues = React.useMemo(() => ({
    isActive: true,
    ...initialData,
  }), [initialData]);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  // Handle API errors
  React.useEffect(() => {
    if (apiError) {
      setError(apiError.field, {
        type: 'manual',
        message: apiError.message,
      });
      
      // Focus the field with error after a small delay to ensure the form is rendered
      const timer = setTimeout(() => {
        setFocus(apiError.field);
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // Clear any existing API errors when the form is opened with new data
      clearErrors();
    }
  }, [apiError, setError, setFocus, clearErrors]);

  // Reset form when opening/closing or when initialData changes
  React.useEffect(() => {
    if (open) {
      reset(defaultValues);
    } else {
      // Optionally reset form when closing
      reset();
    }
    // We only want to run this effect when open or defaultValues changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(defaultValues)]);

  const handleFormSubmit: SubmitHandler<CustomerFormData> = async (data) => {
    await onSubmit(data);
  };
  
  

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {initialData?.customerId ? 'Edit Customer' : 'Add New Customer'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit, (errors) => {
        console.error('Form validation errors:', errors);
      })} noValidate>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="customerName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name *"
                    fullWidth
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
                    label="Email *"
                    type="email"
                    fullWidth
                    error={!!errors.customerEmail}
                    helperText={errors.customerEmail?.message}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="customerPhone1"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Phone 1" fullWidth />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="customerPhone2"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Phone 2" fullWidth />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="customerFacebook"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Facebook Profile"
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
                  <TextField {...field} label="Line ID" fullWidth />
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

            <Grid size={{ xs: 12 }}>
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
                    label="Active Customer"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Save'}
          </Button>

        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CustomerForm;
