import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onClose }: ConfirmDialogProps) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="confirm-dialog-title">
    <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
    <DialogContent><DialogContentText>{message}</DialogContentText></DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} color="inherit">{cancelLabel}</Button>
      <Button onClick={onConfirm} variant="contained" color={danger ? 'error' : 'primary'} autoFocus>{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
