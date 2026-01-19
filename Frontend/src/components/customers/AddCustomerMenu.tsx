import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  GroupAdd as GroupAddIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';

interface AddCustomerMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onAddSingleCustomer: () => void;
  onAddMultipleCustomers?: () => void;
  onImportFromCSV?: () => void;
  transformOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number;
    vertical: 'top' | 'center' | 'bottom' | number;
  };
  anchorOrigin?: {
    horizontal: 'left' | 'center' | 'right' | number;
    vertical: 'top' | 'center' | 'bottom' | number;
  };
}

const AddCustomerMenu: React.FC<AddCustomerMenuProps> = ({
  anchorEl,
  onClose,
  onAddSingleCustomer,
  onAddMultipleCustomers = onClose,
  onImportFromCSV = onClose,
  transformOrigin = { horizontal: 'right', vertical: 'top' },
  anchorOrigin = { horizontal: 'right', vertical: 'bottom' },
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      transformOrigin={transformOrigin}
      anchorOrigin={anchorOrigin}
    >
      <MenuItem 
        onClick={() => {
          onAddSingleCustomer();
          onClose();
        }}
      >
        <ListItemIcon>
          <PersonAddIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Add Single Customer</ListItemText>
      </MenuItem>
      <MenuItem 
        onClick={() => {
          onAddMultipleCustomers();
          onClose();
        }}
      >
        <ListItemIcon>
          <GroupAddIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Add Multiple Customers</ListItemText>
      </MenuItem>
      <MenuItem 
        onClick={() => {
          onImportFromCSV();
          onClose();
        }}
      >
        <ListItemIcon>
          <FileUploadIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Import from CSV</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default AddCustomerMenu;
