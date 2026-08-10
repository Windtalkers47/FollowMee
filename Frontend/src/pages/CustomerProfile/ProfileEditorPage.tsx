import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AddRounded,
  ArrowBackRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  LaunchRounded,
  SaveRounded,
  CheckRounded,
  DownloadRounded,
  IosShareRounded,
  QrCode2Rounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { publicProfileApi, PublicProfileApiError } from '../../api/publicProfile.api';
import ProfileShareShowcase, { type ProfileShareStyle } from '../../components/PublicProfile/ProfileShareShowcase';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import ImageCropEditor from '../../components/ImageCropEditor';
import { profileTemplates } from '../../styles/publicProfileTemplates';
import type {
  ProfileAnalytics,
  ProfileLink,
  PublicProfileRecord,
} from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedNumber } from '../../utils/localeFormat';
import { getMissingPublishingFields } from '../../utils/profilePublishing';

const emptyLink = (sortOrder: number): ProfileLink => ({
  platform: 'website',
  label: '',
  url: '',
  sortOrder,
  isVisible: true,
});

const ProfileEditorPage = () => {
  const { profileId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale, t, shareDefaults, setShareDefaults } = useUserPreferences();
  const [profile, setProfile] = useState<PublicProfileRecord | null>(null);
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileMode, setMobileMode] = useState<'edit' | 'preview'>('edit');
  const [mobileStep, setMobileStep] = useState(0);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [previewFormat, setPreviewFormat] = useState<'square' | 'story' | 'landscape'>('square');
  const [shareStyle, setShareStyle] = useState<ProfileShareStyle>(shareDefaults.profileFrame === 'phone' ? 'phone' : 'clean');
  const [exportingShare, setExportingShare] = useState(false);
  const [shareCenterOpen, setShareCenterOpen] = useState(searchParams.has('share'));
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const shareRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const mobileSteps = [
    t('profile.editor.step.identity'),
    t('profile.editor.step.actions'),
    t('profile.editor.step.links'),
    t('profile.editor.step.appearance'),
    t('profile.editor.step.publishing'),
  ];

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
        setError(loadError instanceof Error ? loadError.message : t('profile.editor.loadError'));
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
  ) => {
    setProfile((current) => current ? { ...current, [field]: value } : current);
    const validationKey = field === 'displayName' ? 'display_name' : field === 'slug' ? 'slug' : field === 'primaryCtaLabel' || field === 'primaryCtaUrl' || field === 'links' ? 'primary_link' : null;
    if (validationKey) setValidationErrors(current => {
      const next = { ...current };
      delete next[validationKey];
      return next;
    });
  };

  const setLink = (index: number, patch: Partial<ProfileLink>) => {
    setProfile((current) => {
      if (!current) return current;
      const links = current.links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...patch } : link
      );
      return { ...current, links };
    });
  };

  const save = async (silent = false, candidate = profile) => {
    if (!candidate) return null;
    setSaving(true);
    setError('');
    try {
      const saved = await publicProfileApi.update(candidate.profileId, {
        slug: candidate.slug,
        displayName: candidate.displayName,
        headline: candidate.headline,
        bio: candidate.bio,
        avatarUrl: candidate.avatarUrl,
        imageCrop: candidate.imageCrop,
        templateKey: candidate.templateKey,
        themeConfig: candidate.themeConfig,
        visibility: candidate.visibility,
        primaryCtaLabel: candidate.primaryCtaLabel,
        primaryCtaUrl: candidate.primaryCtaUrl,
        secondaryCtaLabel: candidate.secondaryCtaLabel,
        secondaryCtaUrl: candidate.secondaryCtaUrl,
        showEmail: candidate.showEmail,
        showPhone: candidate.showPhone,
        showAddress: candidate.showAddress,
        seoTitle: candidate.seoTitle,
        seoDescription: candidate.seoDescription,
        links: candidate.links.map((link, index) => ({ ...link, sortOrder: index })),
      });
      setProfile(saved);
      setLastSavedSnapshot(JSON.stringify(saved));
      if (!silent) setNotice(t('profile.editor.draftSaved'));
      return saved;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('profile.editor.saveError'));
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
      setError(t('profile.editor.imageValidation'));
      return;
    }
    setUploadingAvatar(true);
    setError('');
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(t('profile.editor.imageReadError')));
        reader.readAsDataURL(file);
      });
      const saved = await publicProfileApi.uploadAvatar(profile.profileId, image);
      setProfile(saved);
      setLastSavedSnapshot(JSON.stringify(saved));
      setNotice(t('profile.editor.imageUploaded'));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('profile.editor.imageUploadError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const focusValidationField = (key: string) => {
    const step = key === 'display_name' ? 0 : key === 'primary_link' ? 1 : 4;
    setMobileMode('edit');
    setMobileStep(step);
    window.setTimeout(() => {
      const target = fieldRefs.current[key];
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      (target?.querySelector('input') as HTMLElement | null)?.focus({ preventScroll: true });
    }, 80);
  };

  const showValidationErrors = (missing: string[]) => {
    const next = Object.fromEntries(missing.map(key => [key, t(`profile.validation.${key}` as any)]));
    setValidationErrors(next);
    if (missing[0]) focusValidationField(missing[0]);
  };

  const togglePublish = async () => {
    if (!profile) return;
    if (profile.status !== 'published') {
      const missing = getMissingPublishingFields(profile);
      if (missing.length) {
        showValidationErrors(missing);
        return;
      }
    }
    const candidate = profile.status === 'published' || profile.visibility !== 'private'
      ? profile
      : { ...profile, visibility: 'unlisted' as const };
    const autoUnlisted = profile.status !== 'published' && profile.visibility === 'private';
    const saved = await save(false, candidate);
    if (!saved) return;
    setSaving(true);
    try {
      const updated = saved.status === 'published'
        ? await publicProfileApi.unpublish(saved.profileId)
        : await publicProfileApi.publish(saved.profileId);
      setProfile(updated);
      setLastSavedSnapshot(JSON.stringify(updated));
      setNotice(autoUnlisted && updated.status === 'published'
        ? t('profile.validation.publishedUnlisted')
        : t(updated.status === 'published' ? 'profile.editor.profilePublished' : 'profile.editor.profileUnpublished'));
    } catch (publishError) {
      if (publishError instanceof PublicProfileApiError && publishError.code === 'PROFILE_PUBLISH_CHECKLIST_INCOMPLETE') {
        const missing = Array.isArray(publishError.details?.missingFields) ? publishError.details.missingFields.filter((item): item is string => typeof item === 'string') : [];
        showValidationErrors(missing);
      } else if (publishError instanceof PublicProfileApiError && publishError.code === 'PROFILE_SLUG_CONFLICT') {
        showValidationErrors(['slug']);
      } else {
        setError(publishError instanceof Error ? publishError.message : t('profile.editor.publishError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const changeShareStyle = (style: ProfileShareStyle) => {
    setShareStyle(style);
    void setShareDefaults({ ...shareDefaults, profileFrame: style });
  };

  const exportShare = async () => {
    if (!shareRef.current || !profile) return;
    setExportingShare(true);
    setError('');
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const { toPng } = await import('html-to-image');
      const frame = previewFormat === 'story' ? { width: 540, height: 960 } : previewFormat === 'landscape' ? { width: 800, height: 450 } : { width: 540, height: 540 };
      const dataUrl = await toPng(shareRef.current, { cacheBust: true, pixelRatio: 2, ...frame });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `followmee-${profile.slug}-${previewFormat}-${shareStyle}.png`;
      link.click();
      void publicProfileApi.recordEvent(profile.slug, 'image_export', `${previewFormat}:${shareStyle}`);
    } catch {
      setError(t('profile.editor.exportError'));
    } finally {
      setExportingShare(false);
    }
  };

  const copyPublicUrl = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setNotice(t('profile.editor.urlCopied'));
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: profile?.displayName, url: publicUrl }); return; } catch (shareError) {
        if ((shareError as Error).name === 'AbortError') return;
      }
    }
    await copyPublicUrl();
  };

  const createQr = async () => {
    const QRCode = (await import('qrcode')).default;
    setQrDataUrl(await QRCode.toDataURL(publicUrl, { width: 360, margin: 2, errorCorrectionLevel: 'H' }));
  };

  useEffect(() => {
    if (profile && searchParams.get('share') === 'qr' && !qrDataUrl) void createQr();
  }, [profile?.profileId, searchParams, qrDataUrl]);

  if (loading) {
    return <Box minHeight="70vh" display="grid" sx={{ placeItems: 'center' }}><CircularProgress /></Box>;
  }
  if (!profile) {
    return <Alert severity="error">{error || t('profile.editor.notFound')}</Alert>;
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
            {t('profile.editor.profiles')}
          </Button>
          <Box>
            <Typography variant="h4" fontWeight={850} letterSpacing="-.04em">
              {t('profile.editor.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {saving ? t('profile.editor.saving') : isDirty ? t('profile.editor.unsaved') : t('profile.editor.saved')}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {profile.status === 'published' && profile.visibility !== 'private' && (
            <Button
              startIcon={<IosShareRounded />}
              onClick={() => setShareCenterOpen(true)}
            >
              {t('profile.public.share')}
            </Button>
          )}
          <Button variant="outlined" startIcon={<SaveRounded />} onClick={() => void save()} disabled={saving}>
            {t('profile.editor.saveDraft')}
          </Button>
          {(profile.status === 'published' ? profile.capabilities?.canUnpublish : profile.capabilities?.canPublish) !== false && <Button variant="contained" onClick={togglePublish} disabled={saving}>
            {profile.status === 'published' ? t('profile.editor.unpublish') : t('profile.editor.publish')}
          </Button>}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography fontWeight={800}>{t('profile.validation.summary')}</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {Object.entries(validationErrors).map(([key, message]) => (
              <Button key={key} size="small" color="error" onClick={() => focusValidationField(key)}>{message}</Button>
            ))}
          </Stack>
        </Alert>
      )}

      <ToggleButtonGroup
        value={mobileMode}
        exclusive
        fullWidth
        onChange={(_, value) => value && setMobileMode(value)}
        sx={{ display: { xs: 'flex', lg: 'none' }, mb: 2 }}
      >
        <ToggleButton value="edit">{t('profile.editor.editMode', { step: mobileSteps[mobileStep] })}</ToggleButton>
        <ToggleButton value="preview">{t('profile.editor.previewMode')}</ToggleButton>
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
          <Paper ref={(node) => { fieldRefs.current.display_name = node; }} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 0 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>{t('profile.editor.step.identity')}</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label={t('profile.displayName')}
                value={profile.displayName}
                onChange={(event) => setField('displayName', event.target.value)}
                required
                error={Boolean(validationErrors.display_name)}
                helperText={validationErrors.display_name}
              />
              <TextField
                label={t('profile.editor.headline')}
                value={profile.headline || ''}
                onChange={(event) => setField('headline', event.target.value)}
                inputProps={{ maxLength: 140 }}
                helperText={`${profile.headline?.length || 0}/140`}
              />
              <TextField
                label={t('profile.editor.bio')}
                value={profile.bio || ''}
                onChange={(event) => setField('bio', event.target.value)}
                multiline
                minRows={3}
                inputProps={{ maxLength: 500 }}
              />
              <TextField
                label={t('profile.editor.avatarUrl')}
                value={profile.avatarUrl || ''}
                onChange={(event) => setField('avatarUrl', event.target.value)}
                helperText={t('profile.editor.avatarHelp')}
              />
              <Button component="label" variant="outlined" disabled={uploadingAvatar}>
                {uploadingAvatar ? t('profile.editor.uploading') : t('profile.editor.uploadImage')}
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
              {profile.avatarUrl && (
                <ImageCropEditor
                  src={profile.avatarUrl}
                  value={profile.imageCrop}
                  onChange={(imageCrop) => setField('imageCrop', imageCrop)}
                />
              )}
            </Stack>
          </Paper>

          <Paper ref={(node) => { fieldRefs.current.primary_link = node; }} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 1 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>{t('profile.editor.actionSection')}</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={t('profile.editor.primaryButton')}
                  value={profile.primaryCtaLabel || ''}
                  onChange={(event) => setField('primaryCtaLabel', event.target.value)}
                  fullWidth
                  error={Boolean(validationErrors.primary_link)}
                />
                <TextField
                  label={t('profile.editor.primaryUrl')}
                  value={profile.primaryCtaUrl || ''}
                  onChange={(event) => setField('primaryCtaUrl', event.target.value)}
                  fullWidth
                  error={Boolean(validationErrors.primary_link)}
                  helperText={validationErrors.primary_link}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={t('profile.editor.secondaryButton')}
                  value={profile.secondaryCtaLabel || ''}
                  onChange={(event) => setField('secondaryCtaLabel', event.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('profile.editor.secondaryUrl')}
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
                <Typography variant="h6" fontWeight={800}>{t('profile.editor.links')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('profile.editor.linksHelp')}</Typography>
              </Box>
              <Button
                startIcon={<AddRounded />}
                disabled={profile.links.length >= 12}
                onClick={() => setField('links', [...profile.links, emptyLink(profile.links.length)])}
              >
                {t('profile.editor.add')}
              </Button>
            </Stack>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {profile.links.map((link, index) => (
                <Stack key={link.linkId || index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>{t('profile.editor.type')}</InputLabel>
                    <Select
                      label={t('profile.editor.type')}
                      value={link.platform}
                      onChange={(event) => setLink(index, { platform: event.target.value })}
                    >
                      {['website', 'facebook', 'instagram', 'tiktok', 'line', 'x'].map((platform) => (
                        <MenuItem key={platform} value={platform}>{platform}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label={t('profile.editor.label')}
                    value={link.label}
                    onChange={(event) => setLink(index, { label: event.target.value })}
                    sx={{ flex: 0.8 }}
                  />
                  <TextField
                    label={t('profile.editor.urlHandle')}
                    value={link.url}
                    onChange={(event) => setLink(index, { url: event.target.value })}
                    sx={{ flex: 1.2 }}
                  />
                  <Button
                    color="error"
                    aria-label={t('profile.editor.removeLink')}
                    onClick={() => setField('links', profile.links.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <DeleteOutlineRounded />
                  </Button>
                </Stack>
              ))}
              {!profile.links.length && (
                <Typography color="text.secondary">{t('profile.editor.noLinks')}</Typography>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 3 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>{t('profile.editor.appearance')}</Typography>
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
                  variant="outlined"
                  onClick={() => setField('templateKey', template.key)}
                  aria-pressed={profile.templateKey === template.key}
                  sx={{
                    minHeight: 132,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    textAlign: 'left',
                    position: 'relative',
                    p: 1.5,
                    background: template.background,
                    color: template.text,
                    borderWidth: profile.templateKey === template.key ? 2 : 1,
                    borderColor: profile.templateKey === template.key ? template.accent : 'divider',
                    borderRadius: 3,
                    '&:hover': { borderColor: template.accent, background: template.background },
                  }}
                >
                  {profile.templateKey === template.key && (
                    <CheckRounded sx={{ position: 'absolute', top: 10, right: 10, color: template.accent }} />
                  )}
                  <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: template.accent, mb: 1 }} />
                  <Typography fontWeight={800} color="inherit">{template.name}</Typography>
                  <Typography variant="caption" sx={{ color: template.muted, lineHeight: 1.25, mt: 0.5 }}>
                    {t(template.descriptionKey)}
                  </Typography>
                </Button>
              ))}
            </Box>
          </Paper>

          <Paper ref={(node) => { fieldRefs.current.slug = node; }} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, display: { xs: mobileStep === 4 ? 'block' : 'none', lg: 'block' } }}>
            <Typography variant="h6" fontWeight={800}>{t('profile.editor.publishingPrivacy')}</Typography>
            <Alert severity={profile.publishingChecklist?.every(item => item.complete) ? 'success' : 'warning'} sx={{ mt: 2 }}>
              {(profile.publishingChecklist || [
                { key: 'display_name', complete: Boolean(profile.displayName.trim()) },
                { key: 'primary_link', complete: Boolean((profile.primaryCtaLabel && profile.primaryCtaUrl) || profile.links.some(link => link.isVisible && link.url)) },
                { key: 'slug', complete: /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(profile.slug) },
              ]).map(item => `${item.complete ? '✓' : '○'} ${item.key.replaceAll('_', ' ')}`).join(' · ')}
            </Alert>
            <Alert severity="info" sx={{ mt: 1 }}>{t('profile.validation.recommendations')}</Alert>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label={t('profile.editor.profileUrl')}
                value={profile.slug}
                onChange={(event) => setField('slug', event.target.value)}
                helperText={validationErrors.slug || publicUrl}
                error={Boolean(validationErrors.slug)}
                FormHelperTextProps={{ error: Boolean(validationErrors.slug) }}
                InputProps={{
                  endAdornment: (
                    <Button
                      aria-label={t('profile.editor.copyUrl')}
                      onClick={() => {
                        void navigator.clipboard.writeText(publicUrl);
                        setNotice(t('profile.editor.urlCopied'));
                      }}
                    >
                      <ContentCopyRounded />
                    </Button>
                  ),
                }}
              />
              <FormControl>
                <InputLabel>{t('profile.editor.visibility')}</InputLabel>
                <Select
                  label={t('profile.editor.visibility')}
                  value={profile.visibility}
                  onChange={(event) => setField('visibility', event.target.value as PublicProfileRecord['visibility'])}
                >
                  <MenuItem value="public">{t('profile.editor.visibilityPublic')}</MenuItem>
                  <MenuItem value="unlisted">{t('profile.editor.visibilityUnlisted')}</MenuItem>
                  <MenuItem value="private">{t('profile.editor.visibilityPrivate')}</MenuItem>
                </Select>
              </FormControl>
              <Divider />
              <Typography variant="subtitle2">{t('profile.editor.publicContacts')}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }}>
                <FormControlLabel
                  control={<Checkbox checked={profile.showEmail} onChange={(event) => setField('showEmail', event.target.checked)} />}
                  label={t('profile.editor.showEmail')}
                />
                <FormControlLabel
                  control={<Checkbox checked={profile.showPhone} onChange={(event) => setField('showPhone', event.target.checked)} />}
                  label={t('profile.editor.showPhone')}
                />
                <FormControlLabel
                  control={<Checkbox checked={profile.showAddress} onChange={(event) => setField('showAddress', event.target.checked)} />}
                  label={t('profile.editor.showAddress')}
                />
              </Stack>
              <Alert severity="info">
                {t('profile.editor.contactPrivacy')}
              </Alert>
              <TextField
                label={t('profile.editor.seoTitle')}
                value={profile.seoTitle || ''}
                onChange={(event) => setField('seoTitle', event.target.value)}
                inputProps={{ maxLength: 70 }}
              />
              <TextField
                label={t('profile.editor.seoDescription')}
                value={profile.seoDescription || ''}
                onChange={(event) => setField('seoDescription', event.target.value)}
                multiline
                inputProps={{ maxLength: 160 }}
              />
            </Stack>
          </Paper>
          <Stack direction="row" justifyContent="space-between" sx={{ display: { xs: 'flex', lg: 'none' } }}>
            <Button disabled={mobileStep === 0} onClick={() => setMobileStep((step) => Math.max(0, step - 1))}>
              {t('profile.editor.previous')}
            </Button>
            {mobileStep < mobileSteps.length - 1 ? (
              <Button variant="contained" onClick={() => setMobileStep((step) => Math.min(mobileSteps.length - 1, step + 1))}>
                {t('profile.editor.next')}
              </Button>
            ) : (
              <Button variant="contained" onClick={() => setMobileMode('preview')}>{t('profile.editor.previewMode')}</Button>
            )}
          </Stack>
        </Stack>

        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 90 }, display: { xs: mobileMode === 'preview' ? 'block' : 'none', lg: 'block' } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={800}>{t('profile.editor.previewMode')}</Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={t(profile.status === 'published' ? 'profile.status.published' : 'profile.status.draft')} color={profile.status === 'published' ? 'success' : 'default'} />
              <Chip size="small" label={t('profile.views', { count: formatLocalizedNumber(analytics?.viewCount || Number(profile.viewCount || 0), locale) })} variant="outlined" />
            </Stack>
          </Stack>
          <Paper variant="outlined" sx={{ borderRadius: 5, overflow: 'hidden', bgcolor: 'background.default' }}>
            <ProfileLandingCard profile={profile} preview disableMotion />
          </Paper>
          <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 4 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('profile.editor.engagement')}
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
                  [t('profile.editor.views'), analytics?.viewCount || Number(profile.viewCount || 0)],
                  [t('profile.editor.linkClicks'), analytics?.totals.link_click || 0],
                  [t('profile.editor.shares'), analytics?.totals.share || 0],
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

      <Dialog open={shareCenterOpen} onClose={() => setShareCenterOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('profile.shareCenter.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label={t('profile.editor.profileUrl')}
              value={publicUrl}
              InputProps={{ readOnly: true, endAdornment: <Button onClick={() => void copyPublicUrl()} startIcon={<ContentCopyRounded />}>{t('profile.editor.copyUrl')}</Button> }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              <Button startIcon={<LaunchRounded />} onClick={() => window.open(`/p/${profile.slug}`, '_blank', 'noopener,noreferrer')}>{t('profile.editor.openLive')}</Button>
              <Button startIcon={<IosShareRounded />} onClick={() => void shareProfile()}>{t('profile.public.share')}</Button>
              <Button startIcon={<QrCode2Rounded />} onClick={() => void createQr()}>{t('profile.public.qrCode')}</Button>
            </Stack>
            {qrDataUrl && (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
                <Box component="img" src={qrDataUrl} alt={t('profile.public.qrAlt', { name: profile.displayName })} sx={{ width: 220, maxWidth: '100%' }} />
                <Button component="a" href={qrDataUrl} download={`${profile.slug}-qr.png`} fullWidth>{t('profile.public.downloadQr')}</Button>
              </Paper>
            )}
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
              <ToggleButtonGroup exclusive size="small" value={previewFormat} onChange={(_, value) => value && setPreviewFormat(value)}>
                <ToggleButton value="square">{t('feature.square')}</ToggleButton>
                <ToggleButton value="story">{t('feature.story')}</ToggleButton>
                <ToggleButton value="landscape">{t('feature.landscape')}</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup exclusive size="small" value={shareStyle} onChange={(_, value) => value && changeShareStyle(value)}>
                <ToggleButton value="clean">{t('profile.editor.cleanCard')}</ToggleButton>
                <ToggleButton value="phone">{t('profile.editor.premiumPhone')}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Box sx={{ mx: 'auto', width: { xs: previewFormat === 'story' ? 270 : previewFormat === 'landscape' ? 304 : 307, sm: previewFormat === 'story' ? 324 : previewFormat === 'landscape' ? 720 : 576 }, height: { xs: previewFormat === 'story' ? 480 : previewFormat === 'landscape' ? 171 : 307, sm: previewFormat === 'story' ? 576 : previewFormat === 'landscape' ? 405 : 576 }, overflow: 'hidden', borderRadius: 3 }}>
              <Box sx={{ transformOrigin: 'top left', transform: { xs: `scale(${previewFormat === 'story' ? .5 : previewFormat === 'landscape' ? .38 : .48})`, sm: `scale(${previewFormat === 'story' ? .6 : .9})` } }}>
                <ProfileShareShowcase ref={shareRef} profile={profile} format={previewFormat} style={shareStyle} exporting={exportingShare} />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareCenterOpen(false)}>{t('common.close')}</Button>
          <Button variant="contained" startIcon={<DownloadRounded />} disabled={exportingShare} onClick={() => void exportShare()}>
            {exportingShare ? t('profile.editor.exporting') : t('profile.editor.downloadShare')}
          </Button>
        </DialogActions>
      </Dialog>

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
