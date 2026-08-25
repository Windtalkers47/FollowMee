import { useState } from 'react';
import { Alert, Box, Button, Checkbox, Collapse, FormControlLabel, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { publicProfileApi } from '../../api/publicProfile.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export default function ProfileLeadForm({ slug }: { slug: string }) {
  const { t } = useUserPreferences(); const [open, setOpen] = useState(false); const [sending, setSending] = useState(false); const [done, setDone] = useState<'new' | 'duplicate' | null>(null); const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', consent: false, website: '' });
  const submit = async () => { setSending(true); setError(''); try { const params = new URLSearchParams(window.location.search); const sessionId = sessionStorage.getItem('followmee:profile-session') || crypto.randomUUID(); sessionStorage.setItem('followmee:profile-session', sessionId); const result = await publicProfileApi.submitLead(slug, { ...form, sessionId, consentVersion: '2026-08', utmSource: params.get('utm_source'), utmMedium: params.get('utm_medium'), utmCampaign: params.get('utm_campaign') }); setDone(result.duplicate ? 'duplicate' : 'new'); } catch { setError(t('profile.lead.error')); } finally { setSending(false); } };
  return <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 4 }}>
    {!open && !done && <Button fullWidth variant="outlined" onClick={() => setOpen(true)}>{t('profile.lead.open')}</Button>}
    <Collapse in={open && !done}><Stack spacing={1.5} component="form" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography variant="h6" fontWeight={800}>{t('profile.lead.title')}</Typography><Typography variant="body2" color="text.secondary">{t('profile.lead.destinationHelp')}</Typography></Box><IconButton aria-label={t('feedback.close')} onClick={() => setOpen(false)}><CloseRounded /></IconButton></Stack>{error && <Alert severity="error">{error}</Alert>}
      <TextField required label={t('profile.lead.name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField fullWidth type="email" label={t('common.email')} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><TextField fullWidth type="tel" label={t('customers.form.phone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></Stack>
      <TextField multiline minRows={3} label={t('profile.lead.message')} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}/>
      <TextField tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} sx={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }} inputProps={{ 'aria-hidden': true }}/>
      <FormControlLabel control={<Checkbox checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })}/>} label={t('profile.lead.consent')}/>
      <Button type="submit" variant="contained" disabled={sending || !form.name || (!form.email && !form.phone) || !form.consent}>{sending ? t('profile.lead.sending') : t('profile.lead.submit')}</Button>
    </Stack></Collapse>{done && <Alert severity="success">{t(done === 'duplicate' ? 'profile.lead.alreadyReceived' : 'profile.lead.received')}</Alert>}
  </Paper>;
}
