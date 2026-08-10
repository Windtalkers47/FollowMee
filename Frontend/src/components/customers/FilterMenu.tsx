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

type FilterUser = { userId: number; userName: string; userLastName?: string };

interface FilterMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onFilterByStatus?: () => void;
  onFilterByTags?: () => void;
  onFilterByLastActive?: () => void;
  users?: FilterUser[];
  onCreator?: (userId?: number) => void;
  onAssignee?: (userId?: number) => void;
}

const FilterMenu: React.FC<FilterMenuProps> = ({
  anchorEl,
  onClose,
  onFilterByStatus = onClose,
  onFilterByTags = onClose,
  onFilterByLastActive = onClose,
  users = [], onCreator, onAssignee,
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
      <MenuItem onClick={() => { onCreator?.(undefined); onClose(); }}><ListItemText primary="All creators" /></MenuItem>
      {users.map(user => <MenuItem key={`creator-${user.userId}`} onClick={() => { onCreator?.(user.userId); onClose(); }}><ListItemText inset primary={`Creator: ${user.userName} ${user.userLastName || ''}`} /></MenuItem>)}
      <MenuItem onClick={() => { onAssignee?.(undefined); onClose(); }}><ListItemText primary="All assignees" /></MenuItem>
      {users.map(user => <MenuItem key={`assignee-${user.userId}`} onClick={() => { onAssignee?.(user.userId); onClose(); }}><ListItemText inset primary={`Assignee: ${user.userName} ${user.userLastName || ''}`} /></MenuItem>)}
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
