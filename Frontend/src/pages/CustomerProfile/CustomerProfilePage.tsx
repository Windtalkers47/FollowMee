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
        pixelRatio: 2,
        quality: 1,
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
    
    // Instagram Story dimensions: 1080x1350 (9:16 aspect ratio)
    const storyStyle = {
      width: '540px',
      height: '675px', // 9:16 aspect ratio (540:960)
      mx: 'auto',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '16px',
      boxShadow: 3,
      '&:hover .edit-button': {
        opacity: 1,
      },
    } as const;

    return (
      <Box sx={{ p: 2, maxWidth: '600px', mx: 'auto' }}>
        {/* Story Container */}
        <Paper sx={storyStyle} ref={profileRef}>
          {/* Gradient Background */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              // height: '40%', // ปรับขนาดสีของการ์ด Profile
              width: '540px',
              height: '960px',
              borderRadius: 4,
              overflow: 'hidden',
              // background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)',
              // background: 'linear-gradient(135deg, #ff512f, #dd2476)',
            //   background: `
            //   radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%),
            //   linear-gradient(135deg, #ff6b6b, #ffa726, #ffd54f)
            // `,

            // background: 'linear-gradient(160deg, #3b0a0a, #7f1d1d)',
          //   background: `
          //   radial-gradient(circle at 50% 25%, rgba(255,255,255,0.08), transparent 60%),
          //   linear-gradient(160deg, #3b0a0a, #7f1d1d)
          // `,

          // background: '#0f172a',

          // background: 'linear-gradient(145deg, #1e293b, #334155)',

              background: 'linear-gradient(160deg, #fbc2eb, #fcd5ce)',

              // background: 'linear-gradient(160deg, #dbeafe, #e0f2fe)',

              // background: 'linear-gradient(160deg, #d1fae5, #ecfdf5)',

              // background: '#f8fafc',

              // background: 'linear-gradient(160deg, #e0f2fe, #f0f9ff)',

              zIndex: 0,
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
          />

          {/* Content Container */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              p: 3,
              // color: 'Black',
              // color: '#1f2937',
              color: '#1e293b',
              textAlign: 'center',
            }}
          >
            {/* Share Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <IconButton
                onClick={handleMenuOpen}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                <MoreVert />
              </IconButton>
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
            {/* Profile Picture */}
            <Box sx={{ mt: 6, mb: 4, position: 'relative' }}>
              {/* Radial Light Background */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 280,
                  height: 280,
                  background: 'radial-gradient(circle at center, rgba(255,255,255,0.25), transparent 70%)',
                  borderRadius: '50%',
                  zIndex: 0,
                }}
              />
              <Avatar
                src={customer.customerImageUrl || undefined}
                alt={customer.customerName}
                sx={{
                  width: 200,
                  height: 200,
                  fontSize: 80,
                  mx: 'auto',
                  border: '6px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  zIndex: 1,
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
            </Box>

            {/* Name and Title */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h3" fontWeight={900} letterSpacing={1} sx={{ mb: 1, color: '#1f2937' }}>
                {customer.customerName} {customer.customerLastName}
              </Typography>
              {/* <Typography variant="subtitle1" sx={{ opacity: 0.7 }}>
                Follow me
              </Typography> */}
            </Box>

            {/* Social Icons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 3,
              mt: 'auto',
              mb: 4,
              }}>
                {customer.customerFacebook && (
                  <Tooltip title="Facebook" arrow>
                    <IconButton
                      href={customer.customerFacebook}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        bgcolor: '#1877F2',
                        color: 'white',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                        '&:hover': { 
                          bgcolor: '#166FE5',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                        width: 56,
                        height: 56
                      }}
                    >
                      <Facebook />
                    </IconButton>
                  </Tooltip>
                )}
                {customer.customerInstagram && (
                  <Tooltip title="Instagram" arrow>
                    <IconButton
                      href={customer.customerInstagram}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%,#d6249f 60%,#285AEB 90%)',
                        color: 'white',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                        '&:hover': { 
                          opacity: 0.9,
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                        width: 56,
                        height: 56
                      }}
                    >
                      <Instagram />
                    </IconButton>
                  </Tooltip>
                )}
                {customer.customerTikTok && (
                  <Tooltip title="TikTok" arrow>
                    <IconButton
                      href={customer.customerTikTok}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        bgcolor: '#000000',
                        color: 'white',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                        '&:hover': { 
                          bgcolor: '#333333',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                        width: 56,
                        height: 56
                      }}
                    >
                      <MusicNote />
                    </IconButton>
                  </Tooltip>
                )}
                {customer.customerLine && (
                  <Tooltip title="Line" arrow>
                    <IconButton
                      href={`https://line.me/ti/p/${customer.customerLine}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        bgcolor: '#06C755',
                        color: 'white',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                        '&:hover': { 
                          bgcolor: '#05a548',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                        width: 56,
                        height: 56
                      }}
                    >
                      <Message />
                    </IconButton>
                  </Tooltip>
                )}
                {customer.customerX && (
                  <Tooltip title="X (Twitter)" arrow>
                    <IconButton
                      href={customer.customerX}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        bgcolor: '#000000',
                        color: 'white',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                        '&:hover': { 
                          bgcolor: '#333333',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                        width: 56,
                        height: 56
                      }}
                    >
                      <Twitter />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {/* Branding */}
              <Box sx={{ mt: 'auto', textAlign: 'center', opacity: 0.6 }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, letterSpacing: 1 }}>
                  FollowMee
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Download Button */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={downloadImage}
              size="large"
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
                transition: 'all 0.3s ease',
              }}
            >
              Save as Story
            </Button>
          </Box>

        {/* Back Button */}
        <Box textAlign="center" mt={3}>
          <Button 
            variant="outlined" 
            component={Link} 
            to="/customer-profile"
            startIcon={<span>←</span>}
            sx={{ 
              borderRadius: 3, 
              px: 3, 
              py: 1,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 1,
              },
              transition: 'all 0.3s ease',
            }}
          >
            Back to customers
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
