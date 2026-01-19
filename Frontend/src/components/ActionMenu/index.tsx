import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';

interface ActionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose?: () => void;
  onAction?: (action: string) => void;
  isActive?: boolean;
  menuItems?: Array<{
    label: string;
    icon: React.ReactNode;
    action: string;
    color?: string;
    dividerBefore?: boolean;
    dividerAfter?: boolean;
    condition?: (isActive: boolean) => boolean;
  }>;
}

type MenuItemType = {
  label: string;
  icon: React.ReactNode;
  action: string;
  color?: string;
  dividerBefore?: boolean;
  dividerAfter?: boolean;
  condition?: (isActive: boolean) => boolean;
};

const defaultMenuItems: MenuItemType[] = [
  {
    label: 'Send Message',
    icon: <EmailIcon fontSize="small" />,
    action: 'sendMessage',
    dividerAfter: false
  },
  {
    label: 'Add to Group',
    icon: <PersonAddIcon fontSize="small" />,
    action: 'addToGroup',
    dividerAfter: false
  },
  {
    label: 'Mark as Inactive',
    icon: <PersonRemoveIcon fontSize="small" color="warning" />,
    action: 'toggleStatus',
    condition: (isActive: boolean) => isActive === true,
    dividerAfter: false
  },
  {
    label: 'Mark as Active',
    icon: <CheckCircleIcon fontSize="small" color="success" />,
    action: 'toggleStatus',
    condition: (isActive: boolean) => isActive === false,
    dividerAfter: false
  },
  {
    label: 'Ban User',
    icon: <BlockIcon fontSize="small" color="error" />,
    action: 'banUser',
    dividerAfter: false,
    dividerBefore: true,
  },
  {
    label: 'Report',
    icon: <FlagIcon fontSize="small" color="error" />,
    action: 'report',
    dividerBefore: true,
  },
];

const ActionMenu: React.FC<ActionMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onAction,
  isActive = true,
  menuItems = defaultMenuItems,
}) => {
  const handleMenuClick = (action: string) => {
    onAction?.(action);
    onClose?.();
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (item.condition && typeof item.condition === 'function') {
      return item.condition(isActive);
    }
    return true;
  });

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      PaperProps={{
        elevation: 1,
        sx: {
          borderRadius: 2,
          minWidth: 200,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      {filteredMenuItems.flatMap((item, index) => {
        const elements = [];
        
        if (item.dividerBefore) {
          elements.push(<Divider key={`${item.action}-before`} />);
        }
        
        elements.push(
          <MenuItem 
            key={item.action} 
            onClick={() => handleMenuClick(item.action)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        );
        
        if (item.dividerAfter) {
          elements.push(<Divider key={`${item.action}-after`} />);
        }
        
        return elements;
      })}
    </Menu>
  );
};

export default ActionMenu;
