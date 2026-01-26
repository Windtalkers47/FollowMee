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
  Avatar,
  Divider,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';

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
  isActive: boolean;
};

export type ApiError = {
  field: keyof CustomerFormData;
  message: string;
};

const schema: yup.ObjectSchema<CustomerFormData> = yup.object().shape({
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
  isActive: yup.boolean().required(),
});

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  initialData?: Partial<CustomerFormData>;
  apiError?: ApiError | null;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      borderRadius: 2,
      mb: 3,
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
  onClose,
  onSubmit,
  initialData = { isActive: true },
  apiError = null,
}) => {
  const defaultValues = React.useMemo(
    () => ({ isActive: true, ...initialData }),
    [initialData]
  );

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

  /* ================= Effects ================= */
  React.useEffect(() => {
    if (apiError) {
      setError(apiError.field, {
        type: 'manual',
        message: apiError.message,
      });

      setTimeout(() => setFocus(apiError.field), 100);
    } else {
      clearErrors();
    }
  }, [apiError]);

  React.useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, JSON.stringify(defaultValues)]);

  const handleFormSubmit: SubmitHandler<CustomerFormData> = async (data) => {
    await onSubmit(data);
  };

  /* ================= UI ================= */
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* ===== Header ===== */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                {initialData?.customerId ? 'Edit Customer' : 'New Customer'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customer profile & social contact
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
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
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ minWidth: 120 }}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CustomerForm;
