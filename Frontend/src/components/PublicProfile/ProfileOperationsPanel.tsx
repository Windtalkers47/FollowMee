import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import { publicProfileApi, PublicProfileApiError } from '../../api/publicProfile.api';
import type { ProfileDomain, ProfileLink, ProfileLinkCheck, ProfileRevision, PublicProfileRecord } from '../../types/publicProfile.types';
import { parseProfileLinksCsv } from '../../utils/profileLinkImport';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { feedback } from '../../services/feedback.service';

type ImportPreview = { mode: string; links: ProfileLink[]; errors: Array<{ row: number; code: string }>; canApply: boolean; rows: Array<Record<string, unknown>> };
type RevisionDiff = { revision: ProfileRevision; fields: Array<{ field: string; before: unknown; after: unknown }> };

export default function ProfileOperationsPanel({ profile, onUpdated }: { profile: PublicProfileRecord; onUpdated: (profile: PublicProfileRecord) => void }) {
  const { t } = useUserPreferences();
  const [checks, setChecks] = useState<ProfileLinkCheck[]>([]);
  const [revisions, setRevisions] = useState<ProfileRevision[]>([]);
  const [domains, setDomains] = useState<ProfileDomain[]>([]);
  const [hostname, setHostname] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [revisionDiff, setRevisionDiff] = useState<RevisionDiff | null>(null);
  const importErrorLabel = (code: string) => {
    if (code === 'invalid_url') return t('profile.import.error.invalid_url');
    if (code === 'duplicate_destination') return t('profile.import.error.duplicate_destination');
    if (code === 'limit_exceeded') return t('profile.import.error.limit_exceeded');
    return t('profile.import.error.invalid_row');
  };
  const domainStatusLabel = (status: string) => {
    if (status === 'verifying') return t('profile.domains.status.verifying');
    if (status === 'active') return t('profile.domains.status.active');
    if (status === 'failed') return t('profile.domains.status.failed');
    if (status === 'disabled') return t('profile.domains.status.disabled');
    return t('profile.domains.status.pending');
  };

  const refresh = async () => {
    const [history, domainRows] = await Promise.all([
      publicProfileApi.revisions(profile.profileId).catch(() => []),
      profile.capabilities?.canManageDomain ? publicProfileApi.domains(profile.profileId).catch(() => []) : Promise.resolve([]),
    ]);
    setRevisions(history); setDomains(domainRows);
  };
  useEffect(() => { void refresh(); }, [profile.profileId]);

  const previewRows = async (rows: Array<Record<string, unknown>>, localErrors = 0) => {
    setError('');
    const preview = await publicProfileApi.previewLinkImport(profile.profileId, { mode: importMode, rows });
    setImportPreview({ ...preview, rows });
    if (localErrors || preview.errors.length) setError(t('profile.import.partial', { count: localErrors + preview.errors.length }));
  };
  const importFile = async (file?: File) => {
    if (!file) return; const parsed = parseProfileLinksCsv(await file.text());
    if (!parsed.links.length) { setError(t('profile.import.invalid')); return; }
    await previewRows(parsed.links as unknown as Array<Record<string, unknown>>, parsed.errors.length);
  };
  const applyImport = async () => {
    if (!importPreview?.canApply) return;
    const saved = await publicProfileApi.applyLinkImport(profile.profileId, { mode: importMode, rows: importPreview.rows });
    onUpdated(saved); setImportPreview(null); setNotice(t('profile.import.applied', { count: saved.links.length }));
  };
  const templateRows = useMemo(() => [
    { platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/', isVisible: false, sortOrder: 0 },
    { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/', isVisible: false, sortOrder: 1 },
    { platform: 'line', label: 'LINE', url: 'https://line.me/', isVisible: false, sortOrder: 2 },
  ], []);

  const showRevision = async (revision: ProfileRevision) => {
    const result = await publicProfileApi.revisionDiff(profile.profileId, revision.revisionId);
    setRevisionDiff({ revision, fields: result.fields });
  };
  const restore = async () => {
    if (!revisionDiff) return;
    try {
      const confirmation = await feedback.confirm({ title: t('profile.revisions.title'), message: t('profile.revisions.restoreConfirm', { version: revisionDiff.revision.version }), consequence: t('profile.revisions.restoreDraft'), confirmLabel: t('profile.revisions.restore', { version: revisionDiff.revision.version }), cancelLabel: t('common.cancel') });
      if (!confirmation.isConfirmed) return;
      const restored = await publicProfileApi.restoreRevision(profile.profileId, revisionDiff.revision.revisionId); onUpdated(restored); setRevisionDiff(null); await refresh();
    } catch (value) {
      if (value instanceof PublicProfileApiError && value.code === 'PROFILE_SLUG_CONFLICT') {
        const prompt = await feedback.prompt({ title: t('profile.revisions.slugConflict'), message: t('profile.revisions.slugConflictHelp'), confirmLabel: t('profile.revisions.restore', { version: revisionDiff.revision.version }), cancelLabel: t('common.cancel'), field: { label: t('profile.editor.urlHandle'), initialValue: profile.slug }, validate: input => input.trim().length < 3 ? t('profile.validation.slug') : undefined });
        if (prompt.isConfirmed && prompt.value) { const restored = await publicProfileApi.restoreRevision(profile.profileId, revisionDiff.revision.revisionId, prompt.value); onUpdated(restored); setRevisionDiff(null); await refresh(); }
      } else setError(t('profile.revisions.restoreError'));
    }
  };

  return <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 4 }}>
    <Typography variant="h6" fontWeight={850}>{t('profile.operations.title')}</Typography>
    {notice && <Alert severity="success" sx={{ mt: 1 }}>{notice}</Alert>}{error && <Alert severity="warning" sx={{ mt: 1 }}>{error}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mt={2}>
      <Button variant="outlined" onClick={async () => setChecks(await publicProfileApi.checkLinks(profile.profileId))}>{t('profile.links.check')}</Button>
      <FormControl size="small" sx={{ minWidth: 130 }}><InputLabel>{t('profile.import.mode')}</InputLabel><Select value={importMode} label={t('profile.import.mode')} onChange={event => setImportMode(event.target.value as 'append' | 'replace')}><MenuItem value="append">{t('profile.import.append')}</MenuItem><MenuItem value="replace">{t('profile.import.replace')}</MenuItem></Select></FormControl>
      <Button component="label" variant="outlined">{t('profile.import.csv')}<input hidden type="file" accept=".csv,text/csv" onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }}/></Button>
      <Button variant="outlined" onClick={() => void previewRows(templateRows)}>{t('profile.import.template')}</Button>
    </Stack>
    {!!checks.length && <Stack spacing={1} mt={1.5}>{checks.map(check => { let host = check.url; try { host = new URL(check.url).hostname || new URL(check.url).protocol; } catch { /* show original */ } return <Paper key={check.checkId} variant="outlined" sx={{ p: 1.25 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Box><Typography fontWeight={750}>{check.targetKey}</Typography><Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{check.url}</Typography><Typography variant="caption" color="text.secondary">{host} · {new Date(check.checkedAt).toLocaleString()}</Typography></Box><Chip color={check.status === 'ok' ? 'success' : check.status === 'invalid' ? 'error' : 'warning'} label={`${check.httpStatus || ''} ${check.detail || check.status}`.trim()} /></Stack></Paper>; })}</Stack>}
    <Divider sx={{ my: 2 }}/><Typography fontWeight={800}>{t('profile.revisions.title')}</Typography>
    <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>{revisions.slice(0, 12).map(item => <Button size="small" key={item.revisionId} variant="outlined" onClick={() => void showRevision(item)}>v{item.version} · {item.reason}</Button>)}</Stack>

    {profile.capabilities?.canManageDomain && <><Divider sx={{ my: 2 }}/><Typography fontWeight={800}>{t('profile.domains.title')}</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mt={1}><TextField size="small" fullWidth label={t('profile.domains.hostname')} value={hostname} onChange={event => setHostname(event.target.value)}/><Button disabled={!hostname} onClick={async () => { try { await publicProfileApi.addDomain(profile.profileId, hostname); setHostname(''); await refresh(); } catch { setError(t('profile.domains.error')); } }}>{t('common.add')}</Button></Stack><Stack spacing={1} mt={1}>{domains.map(domain => <Paper variant="outlined" sx={{ p: 1.25 }} key={domain.domainId}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Box><Typography fontWeight={750}>{domain.hostname}</Typography>{domain.verification && <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(domain.verification, null, 2)}</Typography>}</Box><Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Chip size="small" label={domain.isCanonical ? t('profile.domains.canonical') : domainStatusLabel(domain.status)}/>{domain.status !== 'active' && <Button size="small" onClick={async () => { await publicProfileApi.verifyDomain(profile.profileId, domain.domainId); await refresh(); }}>{t('profile.domains.verify')}</Button>}{domain.status === 'active' && !domain.isCanonical && <><Button size="small" onClick={async () => { await publicProfileApi.setCanonicalDomain(profile.profileId, domain.domainId, true); await refresh(); }}>{t('profile.domains.makeCanonical')}</Button><Button size="small" onClick={async () => { await publicProfileApi.setCanonicalDomain(profile.profileId, domain.domainId, false); await refresh(); }}>{t('profile.domains.keepOldUrl')}</Button></>}<Button size="small" color="error" onClick={async () => { const result = await feedback.confirm({ title: t('profile.domains.title'), message: t('profile.domains.removeConfirm'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }); if (!result.isConfirmed) return; await publicProfileApi.removeDomain(profile.profileId, domain.domainId); await refresh(); }}>{t('common.delete')}</Button></Stack></Stack></Paper>)}</Stack></>}

    <Dialog open={Boolean(importPreview)} onClose={() => setImportPreview(null)} fullWidth maxWidth="md"><DialogTitle>{t('profile.import.previewTitle')}</DialogTitle><DialogContent><Stack spacing={1}>{importPreview?.links.map(link => <Paper key={`${link.platform}-${link.sortOrder}`} variant="outlined" sx={{ p: 1.25 }}><Typography fontWeight={750}>{link.label}</Typography><Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{link.url}</Typography></Paper>)}{importPreview?.errors.map(item => <Alert severity="error" key={`${item.row}-${item.code}`}>{t('profile.import.rowError', { row: item.row, code: importErrorLabel(item.code) })}</Alert>)}</Stack></DialogContent><DialogActions><Button onClick={() => setImportPreview(null)}>{t('common.cancel')}</Button><Button variant="contained" disabled={!importPreview?.canApply} onClick={() => void applyImport()}>{t('profile.import.apply')}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(revisionDiff)} onClose={() => setRevisionDiff(null)} fullWidth maxWidth="md"><DialogTitle>{t('profile.revisions.diffTitle', { version: revisionDiff?.revision.version || '' })}</DialogTitle><DialogContent><Stack spacing={1}>{revisionDiff?.fields.map(item => <Paper key={item.field} variant="outlined" sx={{ p: 1.25 }}><Typography fontWeight={750}>{item.field}</Typography><Typography variant="caption" color="text.secondary">{String(item.before ?? '—')} → {String(item.after ?? '—')}</Typography></Paper>)}{!revisionDiff?.fields.length && <Alert severity="info">{t('profile.revisions.noChanges')}</Alert>}</Stack></DialogContent><DialogActions><Button onClick={() => setRevisionDiff(null)}>{t('common.cancel')}</Button><Button variant="contained" onClick={() => void restore()}>{t('profile.revisions.restore', { version: revisionDiff?.revision.version || '' })}</Button></DialogActions></Dialog>
  </Paper>;
}
