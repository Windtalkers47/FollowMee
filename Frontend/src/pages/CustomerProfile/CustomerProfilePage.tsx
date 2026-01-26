import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Button,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Facebook,
  Instagram,
  Twitter,
  MusicNote,
  Message,
  ContentCopy,
} from '@mui/icons-material';
import CustomerProfileSearch from '@/components/CustomerProfileSearch';
import { motion } from 'framer-motion';
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
  const [isPublic, setIsPublic] = useState(false);

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
          setIsPublic(true);
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
        setIsPublic(isPublicAccess);
      } else if (!isPublicAccess) {
        // If customer not found with auth, try public endpoint as fallback
        const publicCustomerData = await fetchCustomerById(id, true);
        if (publicCustomerData) {
          setCustomer(publicCustomerData);
          setIsPublic(true);
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

  const profileUrl = `${window.location.origin}/customer-profile/${customerId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
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
    return (
      <Box maxWidth={900} mx="auto" mt={4}>
        <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              height: 160,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            }}
          />

          {/* Profile */}
          <Box px={4} pb={4} textAlign="center">
            <Avatar
              sx={{
                width: 96,
                height: 96,
                fontSize: 40,
                mx: 'auto',
                mt: -6,
                border: '4px solid white',
                bgcolor: 'primary.main',
              }}
            >
              {customer.customerName?.charAt(0)}
            </Avatar>

            <Typography variant="h5" fontWeight={700} mt={2}>
              {customer.customerName} {customer.customerLastName}
            </Typography>

            <Typography color="text.secondary" mt={0.5}>
              {customer.customerEmail || 'No description provided'}
            </Typography>

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

            <Box mt={3} display="flex" justifyContent="center" gap={1.5} flexWrap="wrap">
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

            <Divider sx={{ my: 3 }} />

            {/* Profile URL */}
            <Box
              sx={{
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" noWrap>
                {profileUrl}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton onClick={copyUrl}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        <Box textAlign="center" mt={3}>
          <Button component={Link} to="/customer-profile">
            ← Back to customers
          </Button>
        </Box>
      </Box>
    );
  }

  /* ================= LIST ================= */

  return (
    <Box maxWidth={1100} mx="auto" mt={4}>
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
              cursor: 'pointer',
              transition: '0.2s',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: 6,
              },
            }}
            onClick={() => navigate(`/customer-profile/${c.customerId}`)}
          >
            <Avatar sx={{ bgcolor: 'primary.main', mb: 2 }}>
              {c.customerName?.charAt(0)}
            </Avatar>

            <Typography fontWeight={600}>
              {c.customerName} {c.customerLastName}
            </Typography>

            <Typography variant="body2" color="text.secondary" noWrap>
              {c.customerEmail}
            </Typography>

            <Box mt={2} display="flex" justifyContent="left" gap={1} flexWrap="wrap">
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
