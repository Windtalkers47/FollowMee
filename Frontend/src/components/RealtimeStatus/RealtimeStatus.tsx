import { useEffect, useMemo, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { CloudDoneOutlined, CloudOffOutlined, SyncOutlined } from '@mui/icons-material';
import { webSocketService, type RealtimeConnectionSnapshot } from '../../services/websocket.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedTime } from '../../utils/localeFormat';

export default function RealtimeStatus() {
  const { locale, t } = useUserPreferences();
  const [snapshot, setSnapshot] = useState<RealtimeConnectionSnapshot>(() => webSocketService.getStatusSnapshot());
  useEffect(() => webSocketService.onStatusChange(setSnapshot), []);
  const label = t(`realtime.${snapshot.state}`);
  const updated = useMemo(() => snapshot.lastUpdated ? t('realtime.lastUpdated', { time: formatLocalizedTime(new Date(snapshot.lastUpdated), locale) }) : t('realtime.notUpdatedYet'), [locale, snapshot.lastUpdated, t]);
  const icon = snapshot.state === 'connected' ? <CloudDoneOutlined /> : snapshot.state === 'offline' ? <CloudOffOutlined /> : <SyncOutlined />;
  return <Tooltip title={`${label} · ${updated}`}><Chip icon={icon} label={<><span>{label}</span><span className="realtime-updated"> · {updated}</span></>} color={snapshot.state === 'connected' ? 'success' : snapshot.state === 'offline' ? 'error' : 'warning'} variant="outlined" aria-label={`${label}. ${updated}`} sx={{ ml: 1, maxWidth: 250, color: theme => theme.palette.mode === 'dark' ? (snapshot.state === 'connected' ? theme.palette.success.light : snapshot.state === 'offline' ? theme.palette.error.light : theme.palette.warning.light) : undefined, borderColor: theme => theme.palette.mode === 'dark' ? (snapshot.state === 'connected' ? theme.palette.success.light : snapshot.state === 'offline' ? theme.palette.error.light : theme.palette.warning.light) : undefined, '& .MuiChip-icon': { color: 'inherit' }, '& .realtime-updated': { display: { xs: 'none', lg: 'inline' } }, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} /></Tooltip>;
}
