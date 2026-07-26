import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AddRounded,
  ArrowBackRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  LaunchRounded,
  SaveRounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { publicProfileApi } from '../../api/publicProfile.api';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import { profileTemplates } from '../../styles/publicProfileTemplates';
import type {
  ProfileAnalytics,
  ProfileLink,
  PublicProfileRecord,
} from '../../types/publicProfile.types';

const emptyLink = (sortOrder: number): ProfileLink => ({
  platform: 'website',
  label: '',
  url: '',
  sortOrder,
  isVisible: true,
});

const ProfileEditorPage = () => {
  const { profileId = '' } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileRecord | null>(null);
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileMode, setMobileMode] = useState<'edit' | 'preview'>('edit');
  const [mobileStep, setMobileStep] = useState(0);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const mobileSteps = ['Identity', 'Actions', 'Links', 'Appearance', 'Publishing'];

  useEffect(() => {
    const load = async () => {
      try {
        const [record, stats] = await Promise.all([
          publicProfileApi.get(profileId),
          publicProfileApi.analytics(profileId).catch(() => null),
        ]);
        setProfile(record);
        setLastSavedSnapshot(JSON.stringify(record));
        setAnalytics(stats);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load profile');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [profileId]);

  const publicUrl = useMemo(
    () => profile ? `${window.location.origin}/p/${profile.slug}` : '',
    [profile]
  );
  const isDirty = useMemo(
    () => Boolean(profile && lastSavedSnapshot && JSON.stringify(profile) !== lastSavedSnapshot),
    [profile, lastSavedSnapshot]
  );

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isDirty]);

  const setField = <K extends keyof PublicProfileRecord>(
    field: K,
    value: PublicProfileRecord[K]
  ) => setProfile((current) => current ? { ...current, [field]: value } : current);

  const setLink = (index: number, patch: Partial<ProfileLink>) => {
    setProfile((current) => {
      if (!current) return current;
      const links = current.links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...patch } : link
      );
      return { ...current, links };
    });
  };

  const save = async (silent = false) => {
    if (!profile) return null;
    setSaving(true);
    setError('');
    try {
      const saved = await publicProfileApi.update(profile.profileId, {
        slug: profile.slug,
        displayName: profile.displayName,
        headline: profile.headline,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        templateKey: profile.templateKey,
        themeConfig: profile.themeConfig,
        visibility: profile.visibility,
        primaryCtaLabel: profile.primaryCtaLabel,
        primaryCtaUrl: profile.primaryCtaUrl,
        secondaryCtaLabel: profile.secondaryCtaLabel,
        secondaryCtaUrl: profile.secondaryCtaUrl,
        showEmail: profile.showEmail,
        showPhone: profile.showPhone,
        showAddress: profile.showAddress,
        seoTitle: profile.seoTitle,
        seoDescription: profile.seoDescription,
        links: profile.links.map((link, index) => ({ ...link, sortOrder: index })),
      });
      setProfile(saved);
      setLastSavedSnapshot(JSON.stringify(saved));
      if (!silent) setNotice('Draft saved');
      return saved;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save profile');
      return null;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isDirty || saving || !profile) return;
    const timer = window.setTimeout(() => {
      void save(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [isDirty, profile]);

  const uploadAvatar = async (file?: File) => {
    if (!file || !profile) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
      setError('Choose a PNG, JPEG or WebP image smaller than 6 MB.');
      return;
    }
    setUploadingAvatar(true);
    setError('');
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read image'));
        reader.readAsDataURL(file);
      });
      const saved = await publicProfileApi.uploadAvatar(profile.profileId, image);
      setProfile(saved);
      setLastSavedSnapshot(JSON.stringify(saved));
      setNotice('Profile image uploaded');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const togglePublish = async () => {
    const saved = await save();
    if (!saved) return;
    setSaving(true);
    try {
      const updated = saved.status === 'published'
        ? await publicProfileApi.unpublish(saved.profileId)
        : await publicProfileApi.publish(saved.profileId);
      setProfile(updated);
      setLastSavedSnapshot(JSON.stringify(updated));
      setNotice(updated.status === 'published' ? 'Profile published' : 'Profile returned to draft');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Unable to update publish status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box minHeight="70vh" display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box>;
  }
  if (!profile) {
    return <Alert severity="error">{error || 'Profile not found'}</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 1480, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button onClick={() => navigate('/customer-profile')} startIcon={<ArrowBackRounded />}>
            Profiles
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={850} letterSpacing="-.04em">
              Edit profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {saving ? 'Saving changes…' : isDirty ? 'Unsaved changes' : 'All changes saved'}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {profile.status === 'published' && profile.visibility !== 'private' && (
            <Button
              startIcon={<LaunchRounded />}
              onClick={() => window.open(`/p/${profile.slug}`, '_blank', 'noopener,noreferrer')}
            >
              Open live
            </Button>
          )}
          <Button variant="outlined" startIcon={<SaveRounded />} onClick={() => void save()} disabled={saving}>
            Save draft
          </Button>
          <Button variant="contained" onClick={togglePublish} disabled={saving}>
            {profile.status === 'published' ? 'Unpublish' : 'Save & publish'}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <ToggleButtonGroup
        value={mobileMode}
        exclusive
        fullWidth
        onChange={(_, value) => value && setMobileMode(value)}
        sx={{ display: { xs: 'flex', lg: 'none' }, mb: 2 }}
      >
        <ToggleButton value="edit">Edit · {mobileSteps[mobileStep]}</ToggleButton>
        <ToggleButton value="preview">Preview</ToggleButton>
      </ToggleButtonGroup>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(420px, .85fr) minmax(440px, 1.15fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Stack spacing={2} sx={{ display: { xs: mobileMode === 'edit' ? 'flex' : 'none', lg: 'flex' } }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 0 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>Identity</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Display name"
                value={profile.displayName}
                onChange={(event) => setField('displayName', event.target.value)}
                required
              />
              <TextField
                label="Headline"
                value={profile.headline || ''}
                onChange={(event) => setField('headline', event.target.value)}
                inputProps={{ maxLength: 140 }}
                helperText={`${profile.headline?.length || 0}/140`}
              />
              <TextField
                label="Bio"
                value={profile.bio || ''}
                onChange={(event) => setField('bio', event.target.value)}
                multiline
                minRows={3}
                inputProps={{ maxLength: 500 }}
              />
              <TextField
                label="Avatar image URL"
                value={profile.avatarUrl || ''}
                onChange={(event) => setField('avatarUrl', event.target.value)}
                helperText="Leave blank to use the connected customer's image."
              />
              <Button component="label" variant="outlined" disabled={uploadingAvatar}>
                {uploadingAvatar ? 'Uploading…' : 'Upload profile image'}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    void uploadAvatar(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 1 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>Calls to action</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Primary button"
                  value={profile.primaryCtaLabel || ''}
                  onChange={(event) => setField('primaryCtaLabel', event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Primary URL"
                  value={profile.primaryCtaUrl || ''}
                  onChange={(event) => setField('primaryCtaUrl', event.target.value)}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Secondary button"
                  value={profile.secondaryCtaLabel || ''}
                  onChange={(event) => setField('secondaryCtaLabel', event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Secondary URL"
                  value={profile.secondaryCtaUrl || ''}
                  onChange={(event) => setField('secondaryCtaUrl', event.target.value)}
                  fullWidth
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 2 ? 'block' : 'none', lg: 'block' } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" fontWeight={800}>Links</Typography>
                <Typography variant="body2" color="text.secondary">Up to 12 clear destinations.</Typography>
              </Box>
              <Button
                startIcon={<AddRounded />}
                disabled={profile.links.length >= 12}
                onClick={() => setField('links', [...profile.links, emptyLink(profile.links.length)])}
              >
                Add
              </Button>
            </Stack>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {profile.links.map((link, index) => (
                <Stack key={link.linkId || index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      label="Type"
                      value={link.platform}
                      onChange={(event) => setLink(index, { platform: event.target.value })}
                    >
                      {['website', 'facebook', 'instagram', 'tiktok', 'line', 'x'].map((platform) => (
                        <MenuItem key={platform} value={platform}>{platform}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Label"
                    value={link.label}
                    onChange={(event) => setLink(index, { label: event.target.value })}
                    sx={{ flex: 0.8 }}
                  />
                  <TextField
                    label="URL or handle"
                    value={link.url}
                    onChange={(event) => setLink(index, { url: event.target.value })}
                    sx={{ flex: 1.2 }}
                  />
                  <Button
                    color="error"
                    aria-label="Remove link"
                    onClick={() => setField('links', profile.links.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <DeleteOutlineRounded />
                  </Button>
                </Stack>
              ))}
              {!profile.links.length && (
                <Typography color="text.secondary">No links yet.</Typography>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 3 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>Appearance</Typography>
            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 1,
              }}
            >
              {profileTemplates.map((template) => (
                <Button
                  key={template.key}
                  variant={profile.templateKey === template.key ? 'contained' : 'outlined'}
                  onClick={() => setField('templateKey', template.key)}
                  sx={{
                    minHeight: 96,
                    flexDirection: 'column',
                    background: profile.templateKey === template.key ? template.accent : template.background,
                    color: template.text,
                    borderColor: profile.templateKey === template.key ? template.accent : 'divider',
                  }}
                >
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: template.accent, mb: 1 }} />
                  {template.name}
                </Button>
              ))}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 4 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>Publishing & privacy</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Profile URL"
                value={profile.slug}
                onChange={(event) => setField('slug', event.target.value)}
                helperText={publicUrl}
                InputProps={{
                  endAdornment: (
                    <Button
                      aria-label="Copy public URL"
                      onClick={() => {
                        void navigator.clipboard.writeText(publicUrl);
                        setNotice('Profile URL copied');
                      }}
                    >
                      <ContentCopyRounded />
                    </Button>
                  ),
                }}
              />
              <FormControl>
                <InputLabel>Visibility</InputLabel>
                <Select
                  label="Visibility"
                  value={profile.visibility}
                  onChange={(event) => setField('visibility', event.target.value as PublicProfileRecord['visibility'])}
                >
                  <MenuItem value="public">Public — discoverable and shareable</MenuItem>
                  <MenuItem value="unlisted">Unlisted — anyone with the link</MenuItem>
                  <MenuItem value="private">Private — only you</MenuItem>
                </Select>
              </FormControl>
              <Divider />
              <Typography variant="subtitle2">Contact fields shown publicly</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }}>
                <FormControlLabel
                  control={<Checkbox checked={profile.showEmail} onChange={(event) => setField('showEmail', event.target.checked)} />}
                  label="Email"
                />
                <FormControlLabel
                  control={<Checkbox checked={profile.showPhone} onChange={(event) => setField('showPhone', event.target.checked)} />}
                  label="Phone"
                />
                <FormControlLabel
                  control={<Checkbox checked={profile.showAddress} onChange={(event) => setField('showAddress', event.target.checked)} />}
                  label="Address"
                />
              </Stack>
              <Alert severity="info">
                Customer contact data remains private unless you explicitly enable a field here.
              </Alert>
              <TextField
                label="SEO title"
                value={profile.seoTitle || ''}
                onChange={(event) => setField('seoTitle', event.target.value)}
                inputProps={{ maxLength: 70 }}
              />
              <TextField
                label="SEO description"
                value={profile.seoDescription || ''}
                onChange={(event) => setField('seoDescription', event.target.value)}
                multiline
                inputProps={{ maxLength: 160 }}
              />
            </Stack>
          </Paper>
          <Stack direction="row" justifyContent="space-between" sx={{ display: { xs: 'flex', lg: 'none' } }}>
            <Button disabled={mobileStep === 0} onClick={() => setMobileStep((step) => Math.max(0, step - 1))}>
              Back
            </Button>
            {mobileStep < mobileSteps.length - 1 ? (
              <Button variant="contained" onClick={() => setMobileStep((step) => Math.min(mobileSteps.length - 1, step + 1))}>
                Next
              </Button>
            ) : (
              <Button variant="contained" onClick={() => setMobileMode('preview')}>Preview</Button>
            )}
          </Stack>
        </Stack>

        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 90 }, display: { xs: mobileMode === 'preview' ? 'block' : 'none', lg: 'block' } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={800}>Preview</Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={profile.status} color={profile.status === 'published' ? 'success' : 'default'} />
              <Chip size="small" label={`${analytics?.viewCount || Number(profile.viewCount || 0)} views`} variant="outlined" />
            </Stack>
          </Stack>
          <Box sx={{ maxWidth: 620, mx: 'auto' }}>
            <ProfileLandingCard profile={profile} preview />
            <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Engagement
              </Typography>
              <Box
                sx={{
                  mt: 1.25,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                }}
              >
                {[
                  ['Views', analytics?.viewCount || Number(profile.viewCount || 0)],
                  ['Link clicks', analytics?.totals.link_click || 0],
                  ['Shares', analytics?.totals.share || 0],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'action.hover' }}>
                    <Typography variant="h6" fontWeight={850}>{value}</Typography>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2400}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
  );
};

export default ProfileEditorPage;
