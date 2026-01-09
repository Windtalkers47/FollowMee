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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type CustomerFormData = {
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
  onSubmit: (data: CustomerFormData) => void;
  initialData?: Partial<CustomerFormData>;
  isLoading?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData = { isActive: true },
  isLoading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      isActive: true,
      ...initialData,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        isActive: true,
        ...initialData,
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit: SubmitHandler<CustomerFormData> = (data) => {
    onSubmit(data);
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

      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
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
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Customer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CustomerForm;
