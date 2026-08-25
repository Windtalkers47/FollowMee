import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Step, StepLabel, Stepper, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { publicProfileApi, PublicProfileApiError } from '../../api/publicProfile.api';
import { customerApi } from '../../services/api/customerApi';
import type { CustomerData } from '../../types/customer.types';
import type { PublicProfileLanding } from '../../types/publicProfile.types';
import { profileTemplates } from '../../styles/publicProfileTemplates';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { feedback } from '../../services/feedback.service';

export default function QuickCreatePage() {
  const { t } = useUserPreferences(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [step, setStep] = useState(0); const [mode, setMode] = useState<'standalone'|'existing'|'new'>(params.get('customerId') ? 'existing' : 'standalone');
  const [customers, setCustomers] = useState<CustomerData[]>([]); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [form, setForm] = useState({ customerId: params.get('customerId') || '', firstName: '', lastName: '', email: '', phone: '', displayName: '', avatarUrl: '', headline: '', primaryCtaLabel: '', primaryCtaUrl: '', templateKey: 'soft-mint' });
  useEffect(() => { customerApi.getCustomers(1, 100).then(result => setCustomers(result.data)).catch(() => setCustomers([])); }, []);
  useEffect(() => { const selected = customers.find(c => c.customerId === form.customerId); if (selected && !form.displayName) setForm(current => ({ ...current, displayName: [selected.customerName, selected.customerLastName].filter(Boolean).join(' '), headline: current.headline })); }, [customers, form.customerId, form.displayName]);
  const preview = useMemo<PublicProfileLanding>(() => ({ profileId: 'preview', slug: 'preview', displayName: form.displayName || form.firstName || t('profile.quick.previewName'), headline: form.headline || null, bio: null, avatarUrl: form.avatarUrl || null, templateKey: form.templateKey, themeConfig: null, primaryCtaLabel: form.primaryCtaLabel || null, primaryCtaUrl: form.primaryCtaUrl || null, secondaryCtaLabel: null, secondaryCtaUrl: null, email: null, phone: null, address: null, links: [], seoTitle: form.displayName || form.firstName || t('profile.quick.previewName'), seoDescription: form.headline || null, publishedAt: null }), [form, t]);
  const submit = async (publishNow: boolean) => { setSaving(true); setError(''); try {
    const profile = await publicProfileApi.quickCreate({ ...(mode === 'existing' ? { customerId: form.customerId } : {}), ...(mode === 'new' ? { customer: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone } } : {}), displayName: form.displayName || undefined, avatarUrl: form.avatarUrl || undefined, headline: form.headline, primaryCtaLabel: form.primaryCtaLabel, primaryCtaUrl: form.primaryCtaUrl, templateKey: form.templateKey });
    if (publishNow) { try { await publicProfileApi.publish(profile.profileId); void feedback.success({ title: t('profile.editor.profilePublished'), message: profile.displayName, importance: 'milestone' }); } catch { void feedback.warning({ title: t('profile.quick.savedDraftTitle'), message: t('profile.quick.publishNeedsAttention') }); } }
    navigate(`/customer-profile/${profile.profileId}/edit${publishNow ? '?share=1' : ''}`);
  } catch (value) {
    if (value instanceof PublicProfileApiError && ['PROFILE_QUICK_CREATE_DUPLICATE','PROFILE_CUSTOMER_CONFLICT'].includes(value.code || '')) { const profileId = typeof value.details?.profileId === 'string' ? value.details.profileId : undefined; void feedback.warning({ title: t('profile.quick.duplicateTitle'), message: t('profile.quick.duplicateHelp'), nextAction: profileId ? { label: t('profile.edit'), onClick: () => navigate(`/customer-profile/${profileId}/edit`) } : undefined }); }
    else setError(t('profile.createError'));
  } finally { setSaving(false); } };
  const steps = [t('profile.quick.stepCustomer'), t('profile.quick.stepIdentity'), t('profile.quick.stepStyle'), t('profile.quick.stepReview')];
  return <Box maxWidth={1280} mx="auto" px={{ xs: 2, md: 3 }} py={3}>
    <Typography variant="h4" fontWeight={900}>{t('profile.quick.title')}</Typography><Typography color="text.secondary" mb={3}>{t('profile.quick.subtitle')}</Typography>
    <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>{steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Box display="grid" gridTemplateColumns={{ xs: '1fr', lg: 'minmax(0,1fr) minmax(380px,.8fr)' }} gap={3}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
        {step === 0 && <Stack spacing={2}><ToggleButtonGroup value={mode} exclusive onChange={(_, value) => value && setMode(value)} fullWidth><ToggleButton value="standalone">{t('profile.quick.standalone')}</ToggleButton><ToggleButton value="existing">{t('profile.quick.existing')}</ToggleButton><ToggleButton value="new">{t('profile.quick.newCustomer')}</ToggleButton></ToggleButtonGroup>
          {mode === 'existing' && <FormControl><InputLabel>{t('customers.title')}</InputLabel><Select label={t('customers.title')} value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>{customers.filter(c => c.capabilities.canEdit).map(c => <MenuItem key={c.customerId} value={c.customerId}>{c.customerName} {c.customerLastName}</MenuItem>)}</Select></FormControl>}
          {mode === 'new' && <><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label={t('common.firstName')} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}/><TextField fullWidth label={t('common.lastName')} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}/></Stack><TextField label={t('common.email')} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><TextField label={t('customers.form.phone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></>}
        </Stack>}
        {step === 1 && <Stack spacing={2}><TextField required label={t('profile.displayName')} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}/><TextField label={t('profile.editor.avatarUrl')} value={form.avatarUrl} onChange={e => setForm({ ...form, avatarUrl: e.target.value })}/><TextField label={t('profile.editor.headline')} value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })}/><TextField label={t('profile.editor.primaryButton')} value={form.primaryCtaLabel} onChange={e => setForm({ ...form, primaryCtaLabel: e.target.value })}/><TextField label={t('profile.editor.primaryUrl')} value={form.primaryCtaUrl} onChange={e => setForm({ ...form, primaryCtaUrl: e.target.value })}/></Stack>}
        {step === 2 && <Box display="grid" gridTemplateColumns="repeat(2,1fr)" gap={1.5}>{profileTemplates.map(template => <Button key={template.key} variant={form.templateKey === template.key ? 'contained' : 'outlined'} onClick={() => setForm({ ...form, templateKey: template.key })} sx={{ minHeight: 96, background: form.templateKey === template.key ? undefined : template.background, color: form.templateKey === template.key ? undefined : template.text }}>{template.name}</Button>)}</Box>}
        {step === 3 && <Stack spacing={1}><Typography variant="h6" fontWeight={800}>{t('profile.quick.ready')}</Typography><Typography>{t('profile.quick.reviewHelp')}</Typography><Typography color="text.secondary">{form.displayName || form.firstName} · {form.templateKey}</Typography></Stack>}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" mt={3} gap={1}><Button disabled={step === 0 || saving} onClick={() => setStep(s => s - 1)}>{t('profile.editor.previous')}</Button>{step < 3 ? <Button variant="contained" disabled={(step === 0 && mode === 'existing' && !form.customerId) || (step === 0 && mode === 'new' && (!form.firstName || !form.email))} onClick={() => setStep(s => s + 1)}>{t('profile.editor.next')}</Button> : <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><Button variant="outlined" disabled={saving || !(form.displayName || form.firstName)} onClick={() => void submit(false)}>{t('profile.quick.saveDraft')}</Button><Button variant="contained" disabled={saving || !(form.displayName || form.firstName) || !form.primaryCtaLabel || !form.primaryCtaUrl} onClick={() => void submit(true)}>{saving ? t('profile.editor.saving') : t('profile.quick.publishNow')}</Button></Stack>}</Stack>
      </Paper>
      <Box sx={{ position: { lg: 'sticky' }, top: 88, alignSelf: 'start' }}><ProfileLandingCard profile={preview} preview disableMotion /></Box>
    </Box>
  </Box>;
}
