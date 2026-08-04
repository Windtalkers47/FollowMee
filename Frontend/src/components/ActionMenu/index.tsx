import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircle as ActiveIcon,
  PauseCircle as InactiveIcon,
  Cancel as CancelIcon,
  Flag as FlagIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

type CustomerStatus = 'active' | 'inactive' | 'canceled';

interface ActionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose?: () => void;
  onAction?: (action: string) => void;
  status?: CustomerStatus;
  menuItems?: MenuItemType[];
  canEdit?: boolean;
  canDelete?: boolean;
}

type MenuItemType = {
  label: string;
  icon: React.ReactNode;
  action: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  dividerBefore?: boolean;
  condition?: (status: CustomerStatus) => boolean;
};

const getStatusMenuItems = (status?: CustomerStatus): MenuItemType[] => {
  const baseItems: MenuItemType[] = [
    {
      label: 'Update Customer',
      icon: <EditIcon fontSize="small" />,
      action: 'update',
      color: 'primary',
    },
    // {
    //   label: 'Send Message',
    //   icon: <MessageIcon fontSize="small" />,
    //   action: 'sendMessage',
    //   color: 'primary',
    // },
    // {
    //   label: 'Add to Group',
    //   icon: <GroupAddIcon fontSize="small" />,
    //   action: 'addToGroup',
    //   color: 'primary',
    // },
  ];

  const statusItems: MenuItemType[] = [
    {
      label: 'Mark as Active',
      icon: <ActiveIcon fontSize="small" color="success" />,
      action: 'setActive',
      color: 'success',
      condition: (currentStatus) => currentStatus !== 'active',
    },
    {
      label: 'Mark as Inactive',
      icon: <InactiveIcon fontSize="small" color="warning" />,
      action: 'setInactive',
      color: 'warning',
      condition: (currentStatus) => currentStatus !== 'inactive',
    },
    {
      label: 'Mark as Canceled',
      icon: <CancelIcon fontSize="small" color="error" />,
      action: 'setCanceled',
      color: 'error',
      condition: (currentStatus) => currentStatus !== 'canceled',
    },
  ];

  const otherItems: MenuItemType[] = [
    {
      label: 'Delete Customer',
      icon: <DeleteIcon fontSize="small" />,
      action: 'delete',
      color: 'error',
      dividerBefore: true,
    },
    {
      label: 'Report',
      icon: <FlagIcon fontSize="small" color="warning" />,
      action: 'report',
      color: 'warning',
      dividerBefore: true,
    },
  ];

  return [
    ...baseItems,
    ...statusItems.filter(item => !item.condition || item.condition(status || 'active')),
    ...otherItems,
  ];
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onAction,
  status = 'active',
  menuItems,
  canEdit = true,
  canDelete = true,
}) => {
  const menuItemsToShow = menuItems || getStatusMenuItems(status).filter(item => {
    if (item.action === 'delete') return canDelete;
    if (['update', 'setActive', 'setInactive', 'setCanceled'].includes(item.action)) return canEdit;
    return true;
  });

  const handleMenuClick = (action: string) => {
    onAction?.(action);
    onClose?.();
  };

  const getItemColor = (color?: string) => {
    switch (color) {
      case 'primary': return 'primary.main';
      case 'secondary': return 'secondary.main';
      case 'error': return 'error.main';
      case 'warning': return 'warning.main';
      case 'info': return 'info.main';
      case 'success': return 'success.main';
      default: return 'text.primary';
    }
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      PaperProps={{
        elevation: 4,
        sx: {
          borderRadius: 2,
          minWidth: 220,
          py: 0.5,
          boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.12)',
          '& .MuiMenuItem-root': {
            padding: '8px 16px',
            borderRadius: 1,
            mx: 1,
            my: 0.5,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          },
        },
      }}
    >
      {menuItemsToShow.flatMap((item) => {
        const elements = [];
        
        if (item.dividerBefore) {
          elements.push(
            <Divider 
              key={`${item.action}-divider`} 
              sx={{ my: 0.5 }} 
            />
          );
        }
        
        elements.push(
          <MenuItem 
            key={item.action} 
            onClick={() => handleMenuClick(item.action)}
            sx={{
              color: getItemColor(item.color),
              '&:hover': {
                backgroundColor: `${getItemColor(item.color)}08`,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography variant="body2" fontWeight={500}>
                  {item.label}
                </Typography>
              } 
            />
          </MenuItem>
        );
        
        return elements;
      })}
    </Menu>
  );
};

export default ActionMenu;
