import { Button, IconButton, Tooltip } from '@mui/material';
import { PersonAdd, Refresh } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import type { MessageKey } from '../../i18n/messages';
import { PageHeader } from '../PageState';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export default function CustomerPageHeader({ loading, t, onAdd, onRefresh }: { loading: boolean; t: Translator; onAdd: () => void; onRefresh: () => void }) {
  return <PageHeader title={t('customers.title')} subtitle={t('customers.subtitle')} actions={<>
    <Button component={RouterLink} to="/customer-profile" variant="outlined">{t('customers.profileCards')}</Button>
    <Button variant="contained" startIcon={<PersonAdd />} onClick={onAdd}>{t('customers.add')}</Button>
    <Tooltip title={t('customers.refresh')}><span><IconButton aria-label={t('customers.refresh')} onClick={onRefresh} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider' }}><Refresh /></IconButton></span></Tooltip>
  </>} />;
}
