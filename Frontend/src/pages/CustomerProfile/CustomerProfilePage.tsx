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
} from '@mui/icons-material';
import { toPng } from 'html-to-image';
import Swal from 'sweetalert2';
import CustomerProfileSearch from '@/components/CustomerProfileSearch';
import ProfileImageContent from '@/components/ProfileImageContent';
import customerApi from '@/services/api/customerApi';
import { CustomerData } from '@/types/customer.types';

/* ================= API ================= */

async function fetchAllCustomers(search = ''): Promise<CustomerData[]> {
  const response = await customerApi.getProfileCustomers(1, 100, search);
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileUrl, setProfileUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(0); // Default to first gradient
  const profileRef = useRef<HTMLDivElement>(null);

  // Predefined gradient presets
  const gradientPresets = [
    { name: 'Pink Peach', colors: ['#fbc2eb', '#fcd5ce'] }, // Default
    { name: 'Ocean Blue', colors: ['#6366f1', '#8b5cf6', '#d946ef'] },
    { name: 'Sunset', colors: ['#ff512f', '#dd2476'] },
    { name: 'Warm Light', colors: ['#dbeafe', '#e0f2fe'] },
    { name: 'Fresh Green', colors: ['#d1fae5', '#ecfdf5'] },
    { name: 'Light Gray', colors: ['#f8fafc'] },
    { name: 'Sky Blue', colors: ['#e0f2fe', '#f0f9ff'] },
    { name: 'Dark Red', colors: ['#3b0a0a', '#7f1d1d'] },
    { name: 'Dark Purple', colors: ['#1e293b', '#334155'] },
    { name: 'Dark', colors: ['#0f172a'] },
  ];

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

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      
      // Beautiful SweetAlert2 notification
      await Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Link Copied!',
        text: 'Profile link has been copied to clipboard',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        toast: true,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Error notification
      await Swal.fire({
        position: 'top-end',
        icon: 'error',
        title: 'Copy Failed',
        text: 'Failed to copy profile link',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        toast: true,
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white'
      });
    }
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
      // Wait for all images to load before capturing (handle errors gracefully)
      const images = profileRef.current.querySelectorAll('img');
      
      // Pre-check and hide all potentially problematic images
      const originalStyles: string[] = [];
      images.forEach((img, index) => {
        originalStyles[index] = img.style.display || '';
        const htmlImg = img as HTMLImageElement;
        const src = img.getAttribute('src') || '';
        
        // Aggressive check for any image issues
        const hasIssues = htmlImg.naturalWidth === 0 || 
                         htmlImg.naturalHeight === 0 ||
                         src.includes('404') ||
                         src.includes('undefined') ||
                         src.includes('null') ||
                         src.includes('error') ||
                         !src.startsWith('http') ||
                         (!src.startsWith('data:') && !src.startsWith('http'));
        
        if (hasIssues) {
          img.style.display = 'none';
        }
      });
      
      await Promise.all(
        Array.from(images).map(img => {
          const htmlImg = img as HTMLImageElement;
          
          // Skip already hidden images
          if (img.style.display === 'none') {
            return Promise.resolve();
          }
          
          if (img.complete) return Promise.resolve();
          
          return new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              // Hide on timeout too
              img.style.display = 'none';
              resolve();
            }, 1500); // Further reduced timeout
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              img.style.display = 'none'; // Hide on error
              resolve();
            };
          });
        })
      );

      const dataUrl = await toPng(profileRef.current, {
        pixelRatio: 2,
        quality: 1,
        cacheBust: true,
        skipAutoScale: true,
        imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // tiny fallback
        fetchRequestInit: {
          mode: 'cors',
          credentials: 'omit',
        },
      });
      
      const link = document.createElement('a');
      link.download = `FollowMee-${customer?.customerName || 'customer'}.png`;
      link.href = dataUrl;
      link.click();
      
      // Beautiful SweetAlert2 success notification
      await Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Image Downloaded!',
        text: 'Profile image has been saved successfully',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        toast: true,
        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        color: 'white',
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      
      // Show error message
      await Swal.fire({
        position: 'top-end',
        icon: 'error',
        title: 'Download Failed',
        text: 'Unable to generate image. Profile images may not be available.',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        toast: true,
        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        color: 'white',
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
          // Beautiful SweetAlert2 error notification
          await Swal.fire({
            position: 'top-end',
            icon: 'error',
            title: 'Share Failed',
            text: 'Failed to share profile',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            toast: true,
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
            color: 'white',
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
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(25px) saturate(200%)',
      WebkitBackdropFilter: 'blur(25px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(100, 181, 246, 0.6), transparent)',
        opacity: 0.7,
      },
      '&:hover': {
        transform: 'translateY(-2px) scale(1.02)',
        boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        '& .edit-button': {
          opacity: 1,
        },
      },
    } as const;

    return (
      <Box sx={{ p: 2, maxWidth: '600px', mx: 'auto' }}>
        {/* Hidden Render for Image Capture */}
        <Box
          sx={{
            position: 'fixed',
            top: -9999,
            left: -9999,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          <div ref={profileRef}>
            {customer && (
              <ProfileImageContent
                customer={customer}
                selectedGradient={selectedGradient}
                gradientPresets={gradientPresets}
              />
            )}
          </div>
        </Box>

        {/* Story Container */}
        <Paper sx={storyStyle}>
          {/* Gradient Background */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              width: '540px',
              height: '960px',
              borderRadius: 4,
              overflow: 'hidden',
              background: `linear-gradient(160deg, ${gradientPresets[selectedGradient].colors.join(', ')})`,
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

            {/* Color Preset Selector */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, textAlign: 'center' }}>
                Choose Background Style
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', px: 2 }}>
                {gradientPresets.map((preset, index) => (
                  <Tooltip key={index} title={preset.name} arrow>
                    <Box
                      onClick={() => setSelectedGradient(index)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${preset.colors.join(', ')})`,
                        border: selectedGradient === index ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          borderColor: 'white',
                        }
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
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
                imgProps={{ crossOrigin: 'anonymous' }}
                alt={customer.customerName}
                onError={(e) => {
                  // Fallback to initials on image error
                  const target = e.target as HTMLImageElement;
                  if (target) target.src = '';
                }}
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

      {/* Action Buttons - Apple HIG Style */}
      <Box sx={{ mt: 4, px: 3 }}>
            {/* Primary Action - Save as Story (Hero Button) */}
            <Button
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={downloadImage}
              fullWidth
              size="large"
              sx={{
                borderRadius: 4,
                py: 2,
                mb: 2,
                background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '1.05rem',
                boxShadow: '0 4px 14px rgba(0, 122, 255, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0063d1 0%, #4a47b3 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0, 122, 255, 0.5)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Save as Image
            </Button>

            {/* Secondary Action - Copy Profile Link (Text Button) */}
            <Button
              variant="text"
              startIcon={<ContentCopy />}
              onClick={copyUrl}
              fullWidth
              size="large"
              sx={{
                borderRadius: 3,
                py: 1.5,
                mb: 1,
                color: '#007AFF',
                fontWeight: 500,
                bgcolor: 'rgba(0, 122, 255, 0.08)',
                '&:hover': {
                  bgcolor: 'rgba(0, 122, 255, 0.12)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Profile Link'}
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.08)' }} />

            {/* Navigation - Back to Customers */}
            <Button
              component={Link}
              to="/customer-profile"
              startIcon={<span>←</span>}
              sx={{
                color: '#8E8E93',
                fontWeight: 500,
                fontSize: '0.95rem',
                py: 1,
                px: 2,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'rgba(142, 142, 147, 0.08)',
                  color: '#636366',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Back to Customers
            </Button>
          </Box>
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
              imgProps={{ crossOrigin: 'anonymous' }}
              alt={c.customerName}
              onError={(e) => {
                // Fallback to initials on image error
                const target = e.target as HTMLImageElement;
                if (target) target.src = '';
              }}
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
              sx={{
                bgcolor: '#10b98120',
                color: '#10b981',
              }}
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
