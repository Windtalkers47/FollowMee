import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  FilterAlt as FilterAltIcon,
  Label as LabelIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface FilterMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onFilterByStatus?: () => void;
  onFilterByTags?: () => void;
  onFilterByLastActive?: () => void;
}

const FilterMenu: React.FC<FilterMenuProps> = ({
  anchorEl,
  onClose,
  onFilterByStatus = onClose,
  onFilterByTags = onClose,
  onFilterByLastActive = onClose,
}) => {
  const { t } = useUserPreferences();
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
    >
      <MenuItem 
        onClick={() => {
          onFilterByStatus();
          onClose();
        }}
      >
        <ListItemIcon>
          <FilterAltIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('customers.filterStatus')}</ListItemText>
      </MenuItem>
      <MenuItem 
        onClick={() => {
          onFilterByTags();
          onClose();
        }}
      >
        <ListItemIcon>
          <LabelIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('customers.filterTags')}</ListItemText>
      </MenuItem>
      <MenuItem 
        onClick={() => {
          onFilterByLastActive();
          onClose();
        }}
      >
        <ListItemIcon>
          <AccessTimeIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('customers.filterLastActive')}</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default FilterMenu;
