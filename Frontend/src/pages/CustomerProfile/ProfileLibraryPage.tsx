import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AddRounded,
  AnalyticsRounded,
  EditRounded,
  LinkRounded,
  MoreHorizRounded,
  ContentCopyRounded,
  IosShareRounded,
  QrCode2Rounded,
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
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedNumber } from '../../utils/localeFormat';

const ProfileLibraryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const engagementFocus = searchParams.get('focus') === 'engagement';
  const { locale, t } = useUserPreferences();
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
  const [deleteProfile, setDeleteProfile] = useState<PublicProfileRecord | null>(null);

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
        setError(loadError instanceof Error ? loadError.message : t('profile.loadError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = !query ? profiles : profiles.filter((profile) =>
      [profile.displayName, profile.headline, profile.slug]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
    return engagementFocus ? [...matches].sort((a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0)) : matches;
  }, [engagementFocus, profiles, search]);

  const availableCustomers = customers.filter(
    (customer) => customer.capabilities.canEdit && !profiles.some((profile) => profile.customerId === customer.customerId)
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
      setError(createError instanceof Error ? createError.message : t('profile.createError'));
    } finally {
      setCreating(false);
    }
  };

  const remove = async () => {
    if (!deleteProfile) return;
    try {
      await publicProfileApi.remove(deleteProfile.profileId);
      setProfiles((current) => current.filter((item) => item.profileId !== deleteProfile.profileId));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : t('profile.deleteError'));
    } finally {
      setMenuAnchor(null);
      setMenuProfile(null);
      setDeleteProfile(null);
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
            {t('profile.eyebrow')}
          </Typography>
          <Typography variant="h3" component="h1" fontWeight={850} letterSpacing="-.045em">
            {t('profile.library.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {t('profile.library.subtitle')}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/customer-profile/leads')} sx={{ minHeight: 46, borderRadius: 3 }}>{t('nav.leads')}</Button>
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => navigate('/customer-profile/new')} sx={{ minHeight: 46, borderRadius: 3 }}>{t('profile.quick.create')}</Button>
          <Button onClick={() => setDialogOpen(true)} sx={{ minHeight: 46 }}>{t('profile.createAdvanced')}</Button>
        </Stack>
      </Stack>

      {engagementFocus && <Alert severity="info" sx={{ mt: 3 }} action={<Button color="inherit" onClick={() => setSearchParams(current => { const next = new URLSearchParams(current); next.delete('focus'); return next; }, { replace: true })}>{t('profile.showAll')}</Button>}>{t('profile.engagementFocus')}</Alert>}

      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

      <TextField
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('profile.searchPlaceholder')}
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
                {profile.headline || t('profile.addHeadline')}
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
                {profile.primaryCtaLabel || t('profile.connect')}
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
                  aria-label={t('profile.actions')}
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
                  label={t(profile.status === 'published' ? 'profile.status.published' : 'profile.status.draft')}
                  color={profile.status === 'published' ? 'success' : 'default'}
                />
                <Chip
                  size="small"
                  icon={profile.visibility === 'private' ? <VisibilityOffRounded /> : <LinkRounded />}
                  label={t(`profile.visibility.${profile.visibility}`)}
                  variant="outlined"
                />
                {profile.effectiveStatus && <Chip size="small" label={t(`profile.effective.${profile.effectiveStatus}` as any)} color={profile.effectiveStatus === 'live' ? 'success' : profile.effectiveStatus === 'scheduled' ? 'info' : 'warning'} />}
                <Chip
                  size="small"
                  label={profile.shareStatus === 'ready_to_share' ? t('profile.shareStatus.ready_to_share') : profile.shareStatus === 'needs_attention' ? t('profile.shareStatus.needs_attention') : t('profile.shareStatus.draft')}
                  color={profile.shareStatus === 'ready_to_share' ? 'success' : profile.shareStatus === 'needs_attention' ? 'warning' : 'default'}
                  variant={profile.shareStatus === 'ready_to_share' ? 'filled' : 'outlined'}
                />
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 2.5 }}>
                <AnalyticsRounded color="action" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {t('profile.views', { count: formatLocalizedNumber(Number(profile.viewCount || 0), locale) })}
                </Typography>
              </Stack>
            </CardContent>
            <CardActions sx={{ px: 2.5, pb: 2.5 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<EditRounded />}
                onClick={() => navigate(`/customer-profile/${profile.profileId}/edit`)}
                disabled={profile.capabilities?.canEdit === false}
              >
                {t('profile.editPreview')}
              </Button>
              {profile.status === 'published' && profile.visibility !== 'private' && (
                <Button
                  aria-label={t('profile.view')}
                  onClick={() => window.open(`/p/${profile.slug}`, '_blank', 'noopener,noreferrer')}
                >
                  {t('profile.view')}
                </Button>
              )}
            </CardActions>
          </Card>
          );
        })}
      </Box>

      {!filtered.length && (
        <Box textAlign="center" sx={{ py: 10 }}>
          <Typography variant="h6">{t('profile.emptyTitle')}</Typography>
          <Typography color="text.secondary">{t('profile.emptyText')}</Typography>
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem disabled={menuProfile?.capabilities?.canEdit === false} onClick={() => menuProfile && navigate(`/customer-profile/${menuProfile.profileId}/edit`)}>
          {t('profile.edit')}
        </MenuItem>
        {menuProfile?.status === 'published' && menuProfile.visibility !== 'private' && <MenuItem onClick={() => {
          void navigator.clipboard.writeText(`${window.location.origin}/p/${menuProfile.slug}`);
          setMenuAnchor(null);
        }}><ContentCopyRounded fontSize="small" sx={{ mr: 1 }} />{t('profile.editor.copyUrl')}</MenuItem>}
        {menuProfile?.status === 'published' && menuProfile.visibility !== 'private' && <MenuItem onClick={() => navigate(`/customer-profile/${menuProfile.profileId}/edit?share=1`)}><IosShareRounded fontSize="small" sx={{ mr: 1 }} />{t('profile.public.share')}</MenuItem>}
        {menuProfile?.status === 'published' && menuProfile.visibility !== 'private' && <MenuItem onClick={() => navigate(`/customer-profile/${menuProfile.profileId}/edit?share=qr`)}><QrCode2Rounded fontSize="small" sx={{ mr: 1 }} />{t('profile.public.qrCode')}</MenuItem>}
        {menuProfile?.capabilities?.canDelete !== false && <MenuItem onClick={() => { setDeleteProfile(menuProfile); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>{t('profile.delete')}</MenuItem>}
      </Menu>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('profile.createTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t('profile.connectCustomer')}</InputLabel>
              <Select
                value={customerId}
                label={t('profile.connectCustomer')}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <MenuItem value="">{t('profile.standalone')}</MenuItem>
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
                label={t('profile.displayName')}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                helperText={t('profile.createHelp')}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('selection.cancel')}</Button>
          <Button
            variant="contained"
            onClick={create}
            disabled={creating || (!customerId && !displayName.trim())}
          >
            {creating ? t('profile.creating') : t('profile.continueEditor')}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={deleteProfile !== null}
        title={t('profile.deleteTitle')}
        message={t('profile.deleteText')}
        confirmLabel={t('profile.delete')}
        danger
        onClose={() => setDeleteProfile(null)}
        onConfirm={() => void remove()}
      />
    </Box>
  );
};

export default ProfileLibraryPage;
