import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AddRounded,
  ArrowBackRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  SaveRounded,
  CheckRounded,
  IosShareRounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
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
import { publicProfileApi, PublicProfileApiError } from '../../api/publicProfile.api';
import ProfileShareCenter from '../../components/PublicProfile/ProfileShareCenter';
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
import type { MessageKey } from '../../i18n/messages';
import { PageActionBar, PageError, PageHeader, PageLoading, PageShell } from '../../components/PageState';

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
  const { locale, t } = useUserPreferences();
  const [profile, setProfile] = useState<PublicProfileRecord | null>(null);
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileMode, setMobileMode] = useState<'edit' | 'preview'>('edit');
  const [mobileStep, setMobileStep] = useState(0);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [shareCenterOpen, setShareCenterOpen] = useState(searchParams.has('share'));
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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
        console.error('Unable to load profile editor:', loadError);
        setError(t('profile.editor.loadError'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [profileId, t]);

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

  const save = useCallback(async (silent = false, candidate = profile) => {
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
      console.error('Unable to save profile editor:', saveError);
      setError(t('profile.editor.saveError'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [profile, t]);

  useEffect(() => {
    if (!isDirty || saving || !profile) return;
    const timer = window.setTimeout(() => {
      void save(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [isDirty, profile, save, saving]);

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
    const next = Object.fromEntries(missing.map(key => [key, t(`profile.validation.${key}` as MessageKey)]));
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
        console.error('Unable to update profile publishing:', publishError);
        setError(t('profile.editor.publishError'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageShell maxWidth={1480}><PageLoading label={t('feedback.loadingPage')} /></PageShell>;
  }
  if (!profile) {
    return <PageShell maxWidth={1480}><PageError title={t('profile.editor.notFound')} message={error || t('profile.editor.loadError')} retryLabel={t('feedback.retry')} onRetry={() => window.location.reload()} /></PageShell>;
  }

  return (
    <PageShell maxWidth={1480}>
      <Button onClick={() => navigate('/customer-profile')} startIcon={<ArrowBackRounded />} sx={{ mb: 1 }}>
        {t('profile.editor.profiles')}
      </Button>
      <PageHeader
        title={t('profile.editor.title')}
        subtitle={saving ? t('profile.editor.saving') : isDirty ? t('profile.editor.unsaved') : t('profile.editor.saved')}
        actions={profile.status === 'published' && profile.visibility !== 'private' ? (
          <Button startIcon={<IosShareRounded />} onClick={() => setShareCenterOpen(true)}>
            {t('profile.public.share')}
          </Button>
        ) : undefined}
      />
      <PageActionBar>
        <Button variant="outlined" startIcon={<SaveRounded />} onClick={() => void save()} disabled={saving}>
          {t('profile.editor.saveDraft')}
        </Button>
        {(profile.status === 'published' ? profile.capabilities?.canUnpublish : profile.capabilities?.canPublish) !== false && <Button variant="contained" onClick={togglePublish} disabled={saving}>
          {profile.status === 'published' ? t('profile.editor.unpublish') : t('profile.editor.publish')}
        </Button>}
      </PageActionBar>

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
                        <MenuItem key={platform} value={platform}>{t(`profile.platform.${platform}` as MessageKey)}</MenuItem>
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
              ]).map(item => `${item.complete ? '✓' : '○'} ${t(`profile.validation.${item.key}` as MessageKey)}`).join(' · ')}
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

      <ProfileShareCenter
        open={shareCenterOpen}
        onClose={() => setShareCenterOpen(false)}
        profile={profile}
        publicUrl={publicUrl}
        initialMode={searchParams.get('share') === 'qr' ? 'qr' : 'link'}
        onNotice={setNotice}
        onError={setError}
        onEvent={(eventType, target) => void publicProfileApi.recordEvent(profile.slug, eventType, target)}
      />

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2400}
        onClose={() => setNotice('')}
        message={notice}
      />
    </PageShell>
  );
};

export default ProfileEditorPage;
