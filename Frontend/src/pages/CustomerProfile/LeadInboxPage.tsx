import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, InputLabel, MenuItem, Pagination, Paper, Radio,
  RadioGroup, Select, Stack, TextField, Typography,
} from '@mui/material';
import { publicProfileApi, PublicProfileApiError } from '../../api/publicProfile.api';
import { userApi, type User } from '../../api/user.api';
import type { ProfileLead, ProfileLeadStatus, PublicProfileRecord } from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useAppSelector } from '../../store/store';
import { selectLatestIncomingNotification } from '../../store/slices/notificationSlice';
import { feedback } from '../../services/feedback.service';

const statuses: ProfileLeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'spam', 'archived'];
type Match = { customerId: string; displayName: string; reasons: string[] };

export default function LeadInboxPage() {
  const { t } = useUserPreferences();
  const incoming = useAppSelector(selectLatestIncomingNotification);
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<ProfileLead[]>([]);
  const [profiles, setProfiles] = useState<PublicProfileRecord[]>([]);
  const [users, setUsers] = useState<Array<Pick<User, 'userId' | 'userName' | 'userLastName'>>>([]);
  const [status, setStatus] = useState<ProfileLeadStatus | ''>((params.get('status') as ProfileLeadStatus) || '');
  const [profileId, setProfileId] = useState(params.get('profileId') || '');
  const [page, setPage] = useState(Math.max(1, Number(params.get('page') || 1)));
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<ProfileLead | null>(null);
  const [converting, setConverting] = useState<ProfileLead | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversionChoice, setConversionChoice] = useState('new');
  const [conversionEmail, setConversionEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const realtimeSeen = useRef<number | null>(null);
  const limit = 20;

  const friendlyError = (value: unknown) => value instanceof PublicProfileApiError && value.code === 'PROFILE_LEAD_CUSTOMER_CONFLICT'
    ? t('profile.leads.emailConflict')
    : t('profile.leads.convertError');

  const load = useCallback(async () => {
    try {
      setError('');
      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) query.set('status', status);
      if (profileId) query.set('profileId', profileId);
      const data = await publicProfileApi.leads(query.toString());
      setItems(data.items); setTotal(data.total); setUnread(data.unread);
    } catch { setError(t('profile.leads.loadError')); }
  }, [page, profileId, status, t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void Promise.all([publicProfileApi.list(), userApi.getAssignableUsers()]).then(([profileRows, userRows]) => { setProfiles(profileRows); setUsers(userRows); }).catch(() => undefined); }, []);
  useEffect(() => {
    const next = new URLSearchParams();
    if (status) next.set('status', status); if (profileId) next.set('profileId', profileId); if (page > 1) next.set('page', String(page));
    const leadId = params.get('leadId'); if (leadId) next.set('leadId', leadId);
    setParams(next, { replace: true });
  }, [page, profileId, status]);
  useEffect(() => {
    if (!incoming || incoming.notification.notificationType !== 'PUBLIC_PROFILE_LEAD' || realtimeSeen.current === incoming.recipientId) return;
    realtimeSeen.current = incoming.recipientId; void load();
  }, [incoming, load]);
  useEffect(() => {
    const leadId = params.get('leadId'); if (!leadId) return;
    const found = items.find(item => item.leadId === leadId); if (found) setDetail(found);
  }, [items, params]);

  const update = async (leadId: string, next: ProfileLeadStatus) => { try { await publicProfileApi.updateLeadStatus(leadId, next); await load(); } catch { setError(t('profile.leads.convertError')); } };
  const assign = async (leadId: string, assignedTo: number) => { try { await publicProfileApi.assignLead(leadId, assignedTo); await load(); } catch { setError(t('profile.leads.convertError')); } };
  const startConvert = async (lead: ProfileLead) => {
    try {
      const preview = await publicProfileApi.leadDuplicates(lead.leadId) as { matches?: Match[] };
      const candidates = preview.matches || [];
      setConverting(lead); setMatches(candidates); setConversionChoice(candidates[0]?.customerId || 'new'); setConversionEmail(lead.email || '');
    } catch { setError(t('profile.leads.convertError')); }
  };
  const convert = async () => {
    if (!converting) return; setSaving(true);
    try {
      await publicProfileApi.convertLead(converting.leadId, conversionChoice === 'new' ? { customerEmail: conversionEmail || undefined } : { existingCustomerId: conversionChoice });
      setConverting(null); await load(); void feedback.success({ title: t('profile.leads.status.converted'), message: converting.name });
    } catch (value) { setError(friendlyError(value)); }
    finally { setSaving(false); }
  };
  const highlighted = params.get('leadId');
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const profileOptions = useMemo(() => profiles.filter(profile => profile.capabilities?.canManageLeads !== false), [profiles]);

  return <Box maxWidth={1180} mx="auto" p={{ xs: 2, md: 3 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={3}>
      <Box><Typography variant="h4" fontWeight={900}>{t('profile.leads.title')}</Typography><Typography color="text.secondary">{t('profile.leads.subtitle', { count: unread })}</Typography></Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        <FormControl size="small" sx={{ minWidth: 190 }}><InputLabel>{t('profile.displayName')}</InputLabel><Select label={t('profile.displayName')} value={profileId} onChange={event => { setProfileId(event.target.value); setPage(1); }}><MenuItem value="">{t('common.all')}</MenuItem>{profileOptions.map(profile => <MenuItem key={profile.profileId} value={profile.profileId}>{profile.displayName}</MenuItem>)}</Select></FormControl>
        <FormControl size="small" sx={{ minWidth: 190 }}><InputLabel>{t('profile.leads.status')}</InputLabel><Select label={t('profile.leads.status')} value={status} onChange={event => { setStatus(event.target.value as ProfileLeadStatus | ''); setPage(1); }}><MenuItem value="">{t('common.all')}</MenuItem>{statuses.map(item => <MenuItem key={item} value={item}>{t(`profile.leads.status.${item}` as any)}</MenuItem>)}</Select></FormControl>
      </Stack>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Stack spacing={1.5}>{items.map(lead => <Paper key={lead.leadId} variant="outlined" sx={{ p: 2.5, borderRadius: 3, borderColor: highlighted === lead.leadId ? 'primary.main' : 'divider', boxShadow: highlighted === lead.leadId ? '0 0 0 2px rgba(112,73,125,.12)' : 'none' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2}>
        <Box sx={{ cursor: 'pointer' }} onClick={() => setDetail(lead)}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="h6" fontWeight={800}>{lead.name}</Typography><Chip size="small" label={t(`profile.leads.status.${lead.status}` as any)}/></Stack><Typography color="text.secondary">{lead.email || lead.phone} · {lead.profile?.displayName}</Typography>{lead.message && <Typography mt={1}>{lead.message}</Typography>}</Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 145 }}><Select value={lead.assignedTo || ''} displayEmpty onChange={event => void assign(lead.leadId, Number(event.target.value))}><MenuItem value="" disabled>{t('task.form.assignedTo')}</MenuItem>{users.map(user => <MenuItem key={user.userId} value={user.userId}>{user.userName} {user.userLastName}</MenuItem>)}</Select></FormControl>
          {lead.status !== 'converted' && <><FormControl size="small" sx={{ minWidth: 140 }}><Select value={lead.status} onChange={event => void update(lead.leadId, event.target.value as ProfileLeadStatus)}>{statuses.filter(item => item !== 'converted').map(item => <MenuItem key={item} value={item}>{t(`profile.leads.status.${item}` as any)}</MenuItem>)}</Select></FormControl><Button variant="contained" onClick={() => void startConvert(lead)}>{t('profile.leads.convert')}</Button></>}
        </Stack>
      </Stack>
    </Paper>)}{!items.length && <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}><Typography>{t('profile.leads.empty')}</Typography></Paper>}</Stack>
    {pageCount > 1 && <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} sx={{ mt: 3, display: 'flex', justifyContent: 'center' }} />}

    <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm"><DialogTitle>{detail?.name}</DialogTitle><DialogContent><Stack spacing={1}><Typography color="text.secondary">{detail?.email || detail?.phone}</Typography><Typography>{detail?.message}</Typography><Typography variant="caption">{detail?.createdAt ? new Date(detail.createdAt).toLocaleString() : ''}</Typography></Stack></DialogContent><DialogActions><Button onClick={() => setDetail(null)}>{t('feedback.done')}</Button></DialogActions></Dialog>

    <Dialog open={Boolean(converting)} onClose={() => !saving && setConverting(null)} fullWidth maxWidth="sm"><DialogTitle>{t('profile.leads.convertTitle')}</DialogTitle><DialogContent><RadioGroup value={conversionChoice} onChange={event => setConversionChoice(event.target.value)}>
      {matches.map(match => <Paper key={match.customerId} variant="outlined" sx={{ p: 1.25, mb: 1 }}><FormControlLabel value={match.customerId} control={<Radio />} label={<Box><Typography fontWeight={750}>{match.displayName}</Typography><Typography variant="caption" color="text.secondary">{t('profile.leads.duplicateReasons', { reasons: match.reasons.map(reason => reason === 'email' ? t('profile.leads.match.email') : reason === 'phone' ? t('profile.leads.match.phone') : reason === 'social_handle' ? t('profile.leads.match.social_handle') : t('profile.leads.match.similar_name')).join(', ') })}</Typography></Box>} /></Paper>)}
      <FormControlLabel value="new" control={<Radio />} label={t('profile.leads.createNew')} />
    </RadioGroup>{conversionChoice === 'new' && <TextField autoFocus={!matches.length} fullWidth type="email" required label={t('common.email')} value={conversionEmail} onChange={event => setConversionEmail(event.target.value)} sx={{ mt: 2 }} />}</DialogContent><DialogActions><Button onClick={() => setConverting(null)} disabled={saving}>{t('common.cancel')}</Button><Button variant="contained" onClick={() => void convert()} disabled={saving || (conversionChoice === 'new' && !conversionEmail)}>{t('profile.leads.convert')}</Button></DialogActions></Dialog>
  </Box>;
}
