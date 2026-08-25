import { Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { Clear, Search } from '@mui/icons-material';
import type { MessageKey } from '../i18n/messages';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export default function CompletedWorkSearch({ value, searching, active, colors, t, onChange, onSearch, onClear }: {
  value: string; searching: boolean; active: boolean; colors: { primary: string; secondary: string; tertiary: string }; t: Translator;
  onChange: (value: string) => void; onSearch: () => void; onClear: () => void;
}) {
  return <Box sx={{ mb: 3 }}>
    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
      <TextField fullWidth placeholder={t('activity.searchCompleted')} value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => event.key === 'Enter' && onSearch()} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: colors.secondary }} /></InputAdornment>, endAdornment: value ? <InputAdornment position="end"><IconButton aria-label={t('common.clear')} onClick={onClear} size="small"><Clear /></IconButton></InputAdornment> : undefined }} sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' }, '& .MuiInputBase-input': { color: colors.primary }, '& .MuiInputBase-input::placeholder': { color: colors.tertiary, opacity: 1 } }} />
      <Button variant="contained" onClick={onSearch} disabled={!value.trim() || searching} startIcon={<Search />} sx={{ minWidth: 120, borderRadius: 2 }}>{searching ? t('activity.searching') : t('common.search')}</Button>
    </Box>
    {active && <Typography variant="caption" sx={{ mt: 1, display: 'block', color: colors.tertiary }}>{t('activity.searchResults', { query: value })}</Typography>}
  </Box>;
}
