import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import {
  Facebook,
  Instagram,
  Twitter,
  MusicNote,
  Message,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import CustomerProfileSearch from '@/components/CustomerProfileSearch';
import { motion } from 'framer-motion';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { customerApi } from '@/services/api/customerApi';
import { CustomerData } from '@/types/customer.types';

/* ================= API ================= */

async function fetchAllCustomers(search = ''): Promise<CustomerData[]> {
  const response = await customerApi.getCustomers(1, 100, search);
  return response.success && Array.isArray(response.data) ? response.data : [];
}

async function fetchCustomerById(customerId: string): Promise<CustomerData | null> {
  const response = await customerApi.getCustomerById(customerId);
  return response.success && response.data ? response.data : null;
}

/* ================= Social ================= */

const socialIcons = {
  facebook: <Facebook color="primary" />,
  instagram: <Instagram color="secondary" />,
  tiktok: <MusicNote color="action" />,
  line: <Message color="success" />,
  x: <Twitter color="info" />,
};

const socialFields = [
  { key: 'customerFacebook', icon: socialIcons.facebook, label: 'Facebook' },
  { key: 'customerInstagram', icon: socialIcons.instagram, label: 'Instagram' },
  { key: 'customerTikTok', icon: socialIcons.tiktok, label: 'TikTok' },
  { key: 'customerLine', icon: socialIcons.line, label: 'Line' },
  { key: 'customerX', icon: socialIcons.x, label: 'X' },
];

/* ================= Component ================= */

const CustomerProfilePage: React.FC = () => {
  const { customerId } = useParams<{ customerId?: string }>();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  /* ================= Loaders ================= */

  const loadCustomers = async (searchValue = '') => {
    setLoading(true);
    const data = await fetchAllCustomers(searchValue);
    setCustomers(data);
    setLoading(false);
  };

  const loadCustomerById = async (id: string) => {
    setLoading(true);
    const data = await fetchCustomerById(id);
    setCustomer(data);
    setLoading(false);
  };

  /* ================= Effects ================= */

  useEffect(() => {
    if (customerId) {
      loadCustomerById(customerId);
    } else {
      loadCustomers();
    }
  }, [customerId]);

  /* ================= Helpers ================= */

  const profileUrl = customerId
    ? `${window.location.origin}/customer/${customerId}/profile`
    : '';

  const handleCopy = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ================= Loading UI ================= */

  if (loading) {
    return (
      <Box
        minHeight="60vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  /* ================= Single Customer ================= */

  if (customerId) {
    if (!customer) {
      return (
        <Typography align="center" color="error" mt={4}>
          Customer not found.
        </Typography>
      );
    }

    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={4}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ width: '100%' }}
        >
          <Paper sx={{ p: 4, borderRadius: 4, maxWidth: 400, mx: 'auto' }}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <Avatar sx={{ width: 80, height: 80, fontSize: 36 }}>
                {customer.customerName?.charAt(0)?.toUpperCase()}
              </Avatar>

              <Typography variant="h5" fontWeight="bold">
                {customer.customerName} {customer.customerLastName}
              </Typography>

              <Typography color="text.secondary" align="center">
                {customer.description || 'No description provided.'}
              </Typography>

              <Box display="flex" flexWrap="wrap" gap={1}>
                {socialFields.map(
                  (field) =>
                    customer[field.key] && (
                      <Button
                        key={field.key}
                        startIcon={field.icon}
                        variant="contained"
                        href={customer[field.key]}
                        target="_blank"
                      >
                        {field.label}
                      </Button>
                    )
                )}
              </Box>

              <Box width="100%" mt={2} display="flex" flexDirection="column" gap={1}>
                <Button variant="outlined" href={customer.shopUrl}>
                  🛍️ Shop
                </Button>
                <Button variant="outlined" href={customer.portfolioUrl}>
                  🗂️ Portfolio
                </Button>
                <Button variant="outlined" href={customer.contactUrl}>
                  ✉️ Contact
                </Button>
              </Box>

              <Box mt={3} textAlign="center">
                <Typography variant="caption">Profile URL</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">{profileUrl}</Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <IconButton onClick={handleCopy} size="small">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Box mt={3} textAlign="center">
            <Button component={Link} to="/customer-profile">
              ← Back to All Customers
            </Button>
          </Box>
        </motion.div>
      </Box>
    );
  }

  /* ================= All Customers ================= */

  return (
    <Box maxWidth={800} mx="auto" mt={4}>
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="h4" mb={3} align="center" fontWeight="bold">
          Customer Profiles
        </Typography>

        <CustomerProfileSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            if (v === '') loadCustomers('');
          }}
          onSearch={() => loadCustomers(search.trim())}
          onClear={() => {
            setSearch('');
            loadCustomers('');
          }}
          onRefresh={() => loadCustomers(search)}
          loading={loading}
        />

        {customers.length === 0 ? (
          <Typography align="center" color="text.secondary" mt={4}>
            No customers found.
          </Typography>
        ) : (
          <Box mt={2} display="flex" flexDirection="column" gap={2}>
            {customers.map((cust) => (
              <Paper
                key={cust.customerId}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 6 },
                }}
                onClick={() =>
                  navigate(`/customer-profile/${cust.customerId}`)
                }
              >
                <Avatar sx={{ mr: 2 }}>
                  {cust.customerName?.charAt(0)?.toUpperCase() ||
                    <AccountCircleIcon />}
                </Avatar>
                <Box>
                  <Typography fontWeight="bold">
                    {cust.customerName} {cust.customerLastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cust.customerEmail}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerProfilePage;
