import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Toolbar,
  Box,
  Collapse
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as ProductsIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';

const drawerWidth = 240;

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/dashboard' 
    },
    { 
      text: 'Users', 
      icon: <PeopleIcon />, 
      path: '/users' 
    },
    { 
      text: 'Products', 
      icon: <ProductsIcon />, 
      path: '/products', 
      subItems: [
        { text: 'All Products', path: '/products' },
        { text: 'Categories', path: '/categories' },
      ]
    },
    { 
      text: 'Analytics', 
      icon: <AnalyticsIcon />, 
      path: '/analytics' 
    },
    { 
      text: 'Settings', 
      icon: <SettingsIcon />, 
      path: '/settings' 
    },
  ];

  const handleSubMenuClick = (text: string) => {
    setOpenSubMenu(openSubMenu === text ? null : text);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: drawerWidth, 
          boxSizing: 'border-box',
          marginTop: '64px', // Height of the header
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <div key={item.text}>
              <ListItem 
                disablePadding 
                onClick={() => {
                  if (item.subItems) {
                    handleSubMenuClick(item.text);
                  } else {
                    navigate(item.path);
                  }
                }}
              >
                <ListItemButton
                  selected={location.pathname === item.path}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.2)',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                  {item.subItems && (
                    openSubMenu === item.text ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
              </ListItem>
              
              {item.subItems && (
                <Collapse in={openSubMenu === item.text} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItemButton
                        key={subItem.text}
                        selected={location.pathname === subItem.path}
                        onClick={() => navigate(subItem.path)}
                        sx={{
                          pl: 6,
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.15)',
                            },
                          },
                        }}
                      >
                        <ListItemText primary={subItem.text} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </div>
          ))}
        </List>
        <Divider />
      </Box>
    </Drawer>
  );
};

export default Sidebar;
