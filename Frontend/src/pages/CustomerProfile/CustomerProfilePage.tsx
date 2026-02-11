import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Button,
  Divider,
  Tooltip,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  ContentCopy,
  Facebook,
  Instagram,
  MusicNote,
  Message,
  Twitter,
  MoreVert,
  Share,
  Download,
  CameraAlt,
  Share as ShareIcon,
} from '@mui/icons-material';
import { toPng } from 'html-to-image';
import CustomerProfileSearch from '@/components/CustomerProfileSearch';

import customerApi from '@/services/api/customerApi';
import { CustomerData } from '@/types/customer.types';

/* ================= API ================= */

async function fetchAllCustomers(search = ''): Promise<CustomerData[]> {
  const response = await customerApi.getCustomers(1, 100, search, 'active');
  return response?.data || [];
}

async function fetchCustomerById(customerId: string, isPublic = false): Promise<CustomerData | null> {
  try {
    if (isPublic) {
      return await customerApi.getPublicCustomerProfile(customerId);
    }
    return await customerApi.getCustomerById(customerId);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}

/* ================= Social ================= */

const socials = [
  { key: 'customerFacebook', icon: <Facebook />, label: 'Facebook' },
  { key: 'customerInstagram', icon: <Instagram />, label: 'Instagram' },
  { key: 'customerTikTok', icon: <MusicNote />, label: 'TikTok' },
  { key: 'customerLine', icon: <Message />, label: 'Line' },
  { key: 'customerX', icon: <Twitter />, label: 'X' },
] as const;

/* ================= Component ================= */

const CustomerProfilePage: React.FC = () => {
  const { customerId } = useParams<{ customerId?: string }>();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileUrl, setProfileUrl] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);

  const loadCustomers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await fetchAllCustomers(q);
      setCustomers(data);
      // If we have a customerId in the URL but no customer data yet, try to load it
      if (customerId && !customer) {
        const customerData = await fetchCustomerById(customerId, true);
        if (customerData) {
          setCustomer(customerData);
          setProfileUrl(`${window.location.origin}/customer-profile/${customerId}`);
        }
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, customer]);

  const loadCustomerById = useCallback(async (id: string, isPublicAccess = false) => {
    setLoading(true);
    try {
      const customerData = await fetchCustomerById(id, isPublicAccess);
      if (customerData) {
        setCustomer(customerData);
        setProfileUrl(`${window.location.origin}/customer-profile/${id}`);
      } else if (!isPublicAccess) {
        // If customer not found with auth, try public endpoint as fallback
        const publicCustomerData = await fetchCustomerById(id, true);
        if (publicCustomerData) {
          setCustomer(publicCustomerData);
          setProfileUrl(`${window.location.origin}/customer-profile/${id}`);
        }
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      // First try to load with authentication
      loadCustomerById(customerId, false);
    } else {
      loadCustomers('');
    }
  }, [customerId]);

  const copyUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const downloadImage = async () => {
    if (!profileRef.current) return;
    
    try {
      const dataUrl = await toPng(profileRef.current, {
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2, // For higher resolution
      });
      
      const link = document.createElement('a');
      link.download = `FollowMee-${customer?.customerName || 'customer'}.png`;
      link.href = dataUrl;
      link.click();
      
      setSnackbar({ open: true, message: 'Image downloaded!', severity: 'success' });
    } catch (error) {
      console.error('Error downloading image:', error);
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : 'Failed to download image', 
        severity: 'error' 
      });
    }
    
    handleMenuClose();
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${customer?.customerName}'s Profile`,
          text: `Check out ${customer?.customerName}'s profile on FollowMee`,
          url: profileUrl,
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          setSnackbar({ 
            open: true, 
            message: 'Error sharing profile', 
            severity: 'error' 
          });
        }
      }
    } else {
      copyUrl();
    }
    handleMenuClose();
  };

  /* ================= Loading ================= */

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  /* ================= SINGLE PROFILE ================= */

  if (customerId && customer) {
    const hasSocialMedia = customer.customerFacebook || customer.customerInstagram || 
                         customer.customerTikTok || customer.customerLine || customer.customerX;
    return (
      <Box maxWidth={900} mx="auto" mt={4} ref={profileRef}>
        {/* Share Menu */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ShareIcon />}
            onClick={handleMenuOpen}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Share
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={shareProfile}>
              <ListItemIcon>
                <Share fontSize="small" />
              </ListItemIcon>
              <ListItemText>Share Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={downloadImage}>
              <ListItemIcon>
                <Download fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download as Image</ListItemText>
            </MenuItem>
            <MenuItem onClick={copyUrl}>
              <ListItemIcon>
                <ContentCopy fontSize="small" />
              </ListItemIcon>
              <ListItemText>Copy Profile Link</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
        <Paper sx={{ 
          borderRadius: 4, 
          overflow: 'hidden',
          position: 'relative',
          '&:hover .edit-button': {
            opacity: 1,
          },
          boxShadow: 3,
        }}>
          {/* Header */}
          <Box
            sx={{
              height: 200,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 100%)',
              },
            }}
          >
            <Box 
              className="edit-button"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                bgcolor: 'rgba(255,255,255,0.9)',
                p: 1,
                borderRadius: '50%',
                boxShadow: 2,
                cursor: 'pointer',
                opacity: 0,
                transition: 'all 0.3s ease',
                zIndex: 1,
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <EditIcon color="primary" />
            </Box>
          </Box>

          {/* Profile */}
          <Box px={{ xs: 2, sm: 4 }} pb={4} textAlign="center">
            <Avatar
              src={customer.customerImageUrl || undefined}
              alt={customer.customerName}
              sx={{
                width: 96,
                height: 96,
                fontSize: 40,
                mx: 'auto',
                mt: -6,
                border: '4px solid white',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                '& .MuiAvatar-img': {
                  objectFit: 'cover'
                }
              }}
            >
              {!customer.customerImageUrl && (
                <>
                  {customer.customerName?.charAt(0).toUpperCase()}
                  {customer.customerLastName?.charAt(0).toUpperCase() || ''}
                </>
              )}
            </Avatar>

            <Box display="flex" alignItems="center" justifyContent="center" gap={1} mt={2}>
              <Typography variant="h5" fontWeight={700}>
                {customer.customerName} {customer.customerLastName}
              </Typography>
              <Tooltip title="Verified" arrow>
                <Box sx={{ color: 'primary.main', display: 'inline-flex' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </Box>
              </Tooltip>
            </Box>

            <Typography color="text.secondary" mt={0.5}>
              {customer.customerEmail}
            </Typography>
            
            {customer.customerPhone1 && (
              <Typography color="text.secondary" mt={0.5}>
                {customer.customerPhone1}
              </Typography>
            )}

            {customer.customerAddress && (
              <Typography color="text.secondary" mt={1}>
                {customer.customerAddress}
              </Typography>
            )}

            {/* Socials */}
            {/* <Box mt={3} display="flex" justifyContent="center" gap={1.5}>
              {socials.map(
                (s) =>
                  customer[s.key] && (
                    <IconButton
                      key={s.key}
                      href={customer[s.key] as string}
                      target="_blank"
                      sx={{
                        bgcolor: 'grey.100',
                        '&:hover': { bgcolor: 'primary.light', color: 'white' },
                      }}
                    >
                      {s.icon}
                    </IconButton>
                  )
              )}
            </Box> */}

            <Box mt={hasSocialMedia ? 0 : 3} display="flex" justifyContent="center" gap={1.5} flexWrap="wrap">
              {customer.customerFacebook && (
                <Tooltip title="Facebook" arrow>
                  <IconButton
                    size="small"
                    href={customer.customerFacebook}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#1877F2',
                      color: 'white',
                      '&:hover': { bgcolor: '#166FE5' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Facebook fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {customer.customerInstagram && (
                <Tooltip title="Instagram" arrow>
                  <IconButton
                    size="small"
                    href={customer.customerInstagram}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%,#d6249f 60%,#285AEB 90%)',
                      color: 'white',
                      '&:hover': { opacity: 0.9 },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Instagram fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {customer.customerTikTok && (
                <Tooltip title="TikTok" arrow>
                  <IconButton
                    size="small"
                    href={customer.customerTikTok}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#000000',
                      color: 'white',
                      '&:hover': { bgcolor: '#333333' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <MusicNote fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {customer.customerLine && (
                <Tooltip title="Line" arrow>
                  <IconButton
                    size="small"
                    href={`https://line.me/ti/p/${customer.customerLine}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#06C755',
                      color: 'white',
                      '&:hover': { bgcolor: '#05a548' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Message fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {customer.customerX && (
                <Tooltip title="X (Twitter)" arrow>
                  <IconButton
                    size="small"
                    href={customer.customerX}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#000000',
                      color: 'white',
                      '&:hover': { bgcolor: '#333333' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Twitter fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {hasSocialMedia && <Divider sx={{ my: 3 }} />}

            {/* Profile URL */}
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 0 0 1px',
                },
              }}
            >
              <Typography 
                variant="body2" 
                noWrap 
                sx={{
                  fontFamily: 'monospace',
                  color: 'text.primary',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profileUrl}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy URL'} arrow>
                <IconButton 
                  onClick={copyUrl}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        <Box textAlign="center" mt={3} display="flex" justifyContent="center" gap={2}>
          <Button 
            variant="outlined" 
            component={Link} 
            to="/customer-profile"
            startIcon={<span>←</span>}
            sx={{ borderRadius: 3, px: 3, py: 1 }}
          >
            Back to customers
          </Button>
          <Button 
            variant="contained" 
            startIcon={<CameraAlt />}
            onClick={downloadImage}
            sx={{ borderRadius: 3, px: 3, py: 1 }}
          >
            Save as Image
          </Button>
        </Box>

        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={3000} 
          onClose={() => setSnackbar({...snackbar, open: false})}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbar({...snackbar, open: false})} 
            severity={snackbar.severity as any}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  /* ================= LIST ================= */

  return (
    <Box maxWidth={1100} mx="auto" py={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Customer Profiles
      </Typography>

      <CustomerProfileSearch
        value={search}
        onChange={setSearch}
        onSearch={() => loadCustomers(search)}
        onClear={() => {
          setSearch('');
          loadCustomers('');
        }}
        onRefresh={() => loadCustomers(search)}
        loading={loading}
      />

      <Box
        mt={4}
        display="grid"
        gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
        gap={3}
      >
        {customers.map((c) => (
          <Paper
            key={c.customerId}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex', // ปุ่ม Active เปิดเพื่อให้มันยืดเต็มการ์ด
              flexDirection: 'column',
              cursor: 'pointer',
              transition: '0.2s',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: 6,
              },
            }}
            onClick={() => navigate(`/customer-profile/${c.customerId}`)}
          >
            <Avatar 
              src={c.customerImageUrl || undefined}
              alt={c.customerName}
              sx={{ 
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                mb: 2,
                '& .MuiAvatar-img': {
                  objectFit: 'cover'
                }
              }}
            >
              {!c.customerImageUrl && c.customerName?.charAt(0).toUpperCase()}
            </Avatar>

            <Typography fontWeight={600}>
              {c.customerName} {c.customerLastName}
            </Typography>

            <Typography variant="body2" color="text.secondary" noWrap>
              {c.customerEmail}
            </Typography>

            <Box 
              mt="auto" 
              pt={2}
              minHeight={40}
              display="flex" 
              justifyContent="left" 
              gap={1} 
              flexWrap="wrap"
              alignItems="flex-end"
            >
              {c.customerFacebook && (
                <Tooltip title="Facebook" arrow>
                  <IconButton
                    size="small"
                    href={c.customerFacebook}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#1877F2',
                      color: 'white',
                      '&:hover': { bgcolor: '#166FE5' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Facebook fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {c.customerInstagram && (
                <Tooltip title="Instagram" arrow>
                  <IconButton
                    size="small"
                    href={c.customerInstagram}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%,#d6249f 60%,#285AEB 90%)',
                      color: 'white',
                      '&:hover': { opacity: 0.9 },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Instagram fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {c.customerTikTok && (
                <Tooltip title="TikTok" arrow>
                  <IconButton
                    size="small"
                    href={c.customerTikTok}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#000000',
                      color: 'white',
                      '&:hover': { bgcolor: '#333333' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <MusicNote fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {c.customerLine && (
                <Tooltip title="Line" arrow>
                  <IconButton
                    size="small"
                    href={`https://line.me/ti/p/${c.customerLine}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#06C755',
                      color: 'white',
                      '&:hover': { bgcolor: '#05a548' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Message fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {c.customerX && (
                <Tooltip title="X (Twitter)" arrow>
                  <IconButton
                    size="small"
                    href={c.customerX}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      bgcolor: '#000000',
                      color: 'white',
                      '&:hover': { bgcolor: '#333333' },
                      width: 28,
                      height: 28
                    }}
                  >
                    <Twitter fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Box
              mt={2}
              display="inline-block"
              px={1.5}
              py={0.5}
              borderRadius={1}
              bgcolor="success.light"
              color="success.dark"
              fontSize={12}
              fontWeight={600}
            >
              Active
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default CustomerProfilePage;
