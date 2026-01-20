import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Button, CircularProgress, Paper, IconButton, Tooltip, TextField, InputAdornment } from '@mui/material';
import { Facebook, Instagram, Twitter, MusicNote, Message, Search as SearchIcon, AccountCircle as AccountCircleIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { customerApi } from '@/services/api/customerApi';
import { CustomerData } from '@/types/customer.types';

// Fetch all customers with optional search
async function fetchAllCustomers(search = ''): Promise<CustomerData[]> {
  const response = await customerApi.getCustomers(1, 100, search);
  if (response.success && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
}

// Fetch single customer by ID
async function fetchCustomerById(customerId: string): Promise<CustomerData | null> {
  const response = await customerApi.getCustomerById(customerId);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

const socialIcons = {
  facebook: <Facebook color="primary" />, // MUI v7
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

const CustomerProfilePage: React.FC = () => {
  const { customerId } = useParams<{ customerId?: string }>();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!customerId) {
      setLoading(true);
      fetchAllCustomers(search).then(data => {
        setCustomers(data);
        setLoading(false);
      });
    } else {
      setLoading(true);
      fetchCustomerById(customerId).then(data => {
        setCustomer(data);
        setLoading(false);
      });
    }
  }, [customerId, search]);

  const profileUrl = customerId ? `${window.location.origin}/customer/${customerId}/profile` : '';

  const handleCopy = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show single customer profile
  if (customerId) {
    if (!customer) {
      return <Typography color="error">Customer not found.</Typography>;
    }
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={4}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ width: '100%' }}
        >
          <Paper elevation={3} sx={{ p: 4, borderRadius: 4, maxWidth: 400, mx: 'auto', width: '100%' }}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <Avatar src={customer.avatarUrl || undefined} sx={{ width: 80, height: 80, fontSize: 36 }}>
                {customer.customerName?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Typography variant="h5" fontWeight="bold">
                {customer.customerName} {customer.customerLastName}
              </Typography>
              <Typography color="text.secondary">
                {customer.description || 'No description provided.'}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                {socialFields.map(field =>
                  customer[field.key] ? (
                    <Button
                      key={field.key}
                      variant="contained"
                      color="primary"
                      startIcon={field.icon}
                      href={customer[field.key]}
                      target="_blank"
                      sx={{ borderRadius: 2, textTransform: 'none', minWidth: 120 }}
                    >
                      {field.label}
                    </Button>
                  ) : null
                )}
              </Box>
              <Box mt={2} width="100%" display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  href={customer.shopUrl}
                  fullWidth
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  🛍️ Shop
                </Button>
                <Button
                  variant="outlined"
                  href={customer.portfolioUrl}
                  fullWidth
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  🗂️ Portfolio
                </Button>
                <Button
                  variant="outlined"
                  href={customer.contactUrl}
                  fullWidth
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  ✉️ Contact
                </Button>
              </Box>
              <Box mt={3} width="100%" display="flex" flexDirection="column" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Profile URL
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{profileUrl}</Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <IconButton onClick={handleCopy} size="small">
                      <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'inherit'} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Paper>
          <Box mt={3} display="flex" justifyContent="center">
            <Button component={Link} to="/customer-profile" variant="text" color="primary">
              ← Back to All Customer Profiles
            </Button>
          </Box>
        </motion.div>
      </Box>
    );
  }

  // Show all customers
  return (
    <Box maxWidth={600} mx="auto" mt={4}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h4" mb={2} fontWeight="bold" align="center">
          Customer Profiles
        </Typography>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mb: 3 }}
        />
        {customers.length === 0 ? (
          <Typography color="text.secondary" align="center">
            No customers found.
          </Typography>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {customers.map(cust => (
              <Paper
                key={cust.customerId}
                elevation={1}
                sx={{ p: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}
                onClick={() => navigate(`/customer-profile/${cust.customerId}`)}
              >
                <Avatar src={cust.avatarUrl || undefined} sx={{ mr: 2 }}>
                  {cust.customerName?.charAt(0)?.toUpperCase() || <AccountCircleIcon />}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
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
