import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AddRounded,
  AnalyticsRounded,
  EditRounded,
  LinkRounded,
  MoreHorizRounded,
  PublicRounded,
  SearchRounded,
  VisibilityOffRounded,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { publicProfileApi } from '../../api/publicProfile.api';
import { customerApi } from '../../api/customer.api';
import type { CustomerData } from '../../types/customer.types';
import type { PublicProfileRecord } from '../../types/publicProfile.types';
import { getProfileTemplate } from '../../styles/publicProfileTemplates';

const ProfileLibraryPage = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<PublicProfileRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuProfile, setMenuProfile] = useState<PublicProfileRecord | null>(null);

  useEffect(() => {
    void Promise.all([
      publicProfileApi.list(),
      customerApi.getCustomers(1, 100),
    ])
      .then(([profileRows, customerResponse]) => {
        setProfiles(profileRows);
        const customerPayload = customerResponse as unknown as { data?: CustomerData[] };
        setCustomers(customerPayload.data || []);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load profile cards');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) =>
      [profile.displayName, profile.headline, profile.slug]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [profiles, search]);

  const availableCustomers = customers.filter(
    (customer) => !profiles.some((profile) => profile.customerId === customer.customerId)
  );

  const create = async () => {
    if (!customerId && !displayName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const profile = await publicProfileApi.create({
        customerId: customerId || undefined,
        displayName: customerId ? undefined : displayName.trim(),
      });
      setDialogOpen(false);
      navigate(`/customer-profile/${profile.profileId}/edit`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create profile');
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!menuProfile || !window.confirm(`Delete "${menuProfile.displayName}"?`)) return;
    try {
      await publicProfileApi.remove(menuProfile.profileId);
      setProfiles((current) => current.filter((item) => item.profileId !== menuProfile.profileId));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to delete profile');
    } finally {
      setMenuAnchor(null);
      setMenuProfile(null);
    }
  };

  if (loading) {
    return (
      <Box minHeight="60vh" display="grid" sx={{ placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'flex-end' }}
        spacing={2}
      >
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            PUBLIC PRESENCE
          </Typography>
          <Typography variant="h3" fontWeight={850} letterSpacing="-.045em">
            Profile Cards
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Build, publish and measure landing pages without exposing private customer data.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() => setDialogOpen(true)}
          sx={{ minHeight: 46, borderRadius: 3 }}
        >
          Create profile
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

      <TextField
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search profile, headline or URL"
        fullWidth
        sx={{ mt: 3, maxWidth: 620 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchRounded /></InputAdornment>
          ),
        }}
      />

      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
          gap: 2,
        }}
      >
        {filtered.map((profile) => {
          const template = getProfileTemplate(profile.templateKey);
          const avatar = profile.avatarUrl || profile.customer?.customerImageUrl || undefined;
          return (
          <Card
            key={profile.profileId}
            variant="outlined"
            sx={{
              borderRadius: 4,
              bgcolor: 'background.paper',
              borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                minHeight: 184,
                m: 1.25,
                mb: 0,
                borderRadius: 2.5,
                background: template.background,
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: template.text,
              }}
            >
              <Avatar
                src={avatar}
                sx={{
                  width: 54,
                  height: 54,
                  bgcolor: template.surface,
                  color: template.text,
                  border: '2px solid rgba(255,255,255,.72)',
                  boxShadow: '0 8px 20px rgba(15,23,42,.12)',
                }}
              >
                {profile.displayName.slice(0, 2).toUpperCase()}
              </Avatar>
              <Typography variant="subtitle1" fontWeight={850} sx={{ mt: 1, color: template.text }}>
                {profile.displayName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: template.muted,
                  maxWidth: 240,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile.headline || 'Add a short headline'}
              </Typography>
              <Box
                sx={{
                  mt: 1.25,
                  minWidth: 112,
                  px: 1.5,
                  py: 0.65,
                  borderRadius: 99,
                  bgcolor: template.accent,
                  color: template.accentText,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {profile.primaryCtaLabel || 'Connect'}
              </Box>
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    {profile.displayName}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    /p/{profile.slug}
                  </Typography>
                </Box>
                <IconButton
                  aria-label="Profile actions"
                  onClick={(event) => {
                    setMenuAnchor(event.currentTarget);
                    setMenuProfile(profile);
                  }}
                >
                  <MoreHorizRounded />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                <Chip
                  size="small"
                  icon={profile.status === 'published' ? <PublicRounded /> : <EditRounded />}
                  label={profile.status === 'published' ? 'Published' : 'Draft'}
                  color={profile.status === 'published' ? 'success' : 'default'}
                />
                <Chip
                  size="small"
                  icon={profile.visibility === 'private' ? <VisibilityOffRounded /> : <LinkRounded />}
                  label={profile.visibility}
                  variant="outlined"
                />
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 2.5 }}>
                <AnalyticsRounded color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {Number(profile.viewCount || 0).toLocaleString()} views
                </Typography>
              </Stack>
            </CardContent>
            <CardActions sx={{ px: 2.5, pb: 2.5 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<EditRounded />}
                onClick={() => navigate(`/customer-profile/${profile.profileId}/edit`)}
              >
                Edit & preview
              </Button>
              {profile.status === 'published' && profile.visibility !== 'private' && (
                <Button
                  aria-label="Open public profile"
                  onClick={() => window.open(`/p/${profile.slug}`, '_blank', 'noopener,noreferrer')}
                >
                  View
                </Button>
              )}
            </CardActions>
          </Card>
          );
        })}
      </Box>

      {!filtered.length && (
        <Box textAlign="center" sx={{ py: 10 }}>
          <Typography variant="h6">No profile cards found</Typography>
          <Typography color="text.secondary">Create one from a customer or start with a blank profile.</Typography>
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => menuProfile && navigate(`/customer-profile/${menuProfile.profileId}/edit`)}>
          Edit profile
        </MenuItem>
        <MenuItem onClick={remove} sx={{ color: 'error.main' }}>Delete profile</MenuItem>
      </Menu>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create profile card</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Connect a customer (optional)</InputLabel>
              <Select
                value={customerId}
                label="Connect a customer (optional)"
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <MenuItem value="">Create a standalone profile</MenuItem>
                {availableCustomers.map((customer) => (
                  <MenuItem key={customer.customerId} value={customer.customerId}>
                    {customer.customerName} {customer.customerLastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!customerId && (
              <TextField
                autoFocus
                label="Display name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                helperText="You can connect or edit details later."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={create}
            disabled={creating || (!customerId && !displayName.trim())}
          >
            {creating ? 'Creating…' : 'Continue to editor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileLibraryPage;
