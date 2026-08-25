import {
  Badge, Box, Button, Collapse, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, TextField, Tooltip,
} from '@mui/material';
import { Clear, Refresh, Search, Tune } from '@mui/icons-material';
import type { User } from '../api/user.api';
import type { MessageKey } from '../i18n/messages';
import type { ScheduleDateFilter } from '../utils/scheduleFocus';

type SortOption = 'updated_desc' | 'due_asc' | 'title_asc';
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export default function ScheduleFilters({
  searchInput, filtersOpen, activeFilterCount, dateFilter, sortBy, assigneeId, users, loading, t,
  onSearchInput, onSearch, onClearSearch, onRefresh, onToggleFilters, onDateFilter, onSort, onAssignee,
}: {
  searchInput: string; filtersOpen: boolean; activeFilterCount: number; dateFilter: ScheduleDateFilter; sortBy: SortOption;
  assigneeId: number | 'all'; users: User[]; loading: boolean; t: Translator;
  onSearchInput: (value: string) => void; onSearch: () => void; onClearSearch: () => void; onRefresh: () => void;
  onToggleFilters: () => void; onDateFilter: (value: ScheduleDateFilter) => void; onSort: (value: SortOption) => void; onAssignee: (value: number | 'all') => void;
}) {
  return <>
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 1, p: 1, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <TextField fullWidth placeholder={t('schedule.searchPlaceholder')} value={searchInput} onChange={event => onSearchInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && onSearch()} variant="outlined" sx={{ flex: '1 1 auto', flexBasis: { xs: '100%', sm: 'auto' }, minWidth: 0, '& .MuiOutlinedInput-root': { border: 'none', '& fieldset': { border: 'none' } } }} InputProps={{ startAdornment: <InputAdornment position="start"><Search color="disabled" /></InputAdornment>, endAdornment: searchInput ? <InputAdornment position="end"><IconButton size="small" aria-label={t('common.clear')} onClick={onClearSearch}><Clear fontSize="small" /></IconButton></InputAdornment> : undefined }} />
      {searchInput.trim() && <Tooltip title={t('common.search')}><IconButton aria-label={t('common.search')} onClick={onSearch}><Search /></IconButton></Tooltip>}
      <Tooltip title={t('common.refresh')}><span><IconButton aria-label={t('schedule.refreshTasks')} onClick={onRefresh} disabled={loading}><Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /></IconButton></span></Tooltip>
      <Badge color="primary" badgeContent={activeFilterCount} invisible={activeFilterCount === 0}>
        <Button variant={filtersOpen ? 'contained' : 'text'} size="small" startIcon={<Tune />} aria-expanded={filtersOpen} aria-controls="schedule-advanced-filters" onClick={onToggleFilters} sx={{ whiteSpace: 'nowrap', minHeight: 40 }}>{t('schedule.moreFilters')}</Button>
      </Badge>
    </Box>
    <Collapse in={filtersOpen}>
      <Box id="schedule-advanced-filters" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(160px, 1fr))' }, gap: 1.5, mt: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
        <FormControl size="small"><InputLabel>{t('taskDetail.assignee')}</InputLabel><Select label={t('taskDetail.assignee')} value={assigneeId} onChange={event => onAssignee(event.target.value === 'all' ? 'all' : Number(event.target.value))}><MenuItem value="all">{t('schedule.anyAssignee')}</MenuItem>{users.map(user => <MenuItem key={user.userId} value={user.userId}>{user.userName} {user.userLastName}</MenuItem>)}</Select></FormControl>
        <FormControl size="small"><InputLabel>{t('schedule.dueDate')}</InputLabel><Select label={t('schedule.dueDate')} value={dateFilter} onChange={event => onDateFilter(event.target.value as ScheduleDateFilter)}><MenuItem value="all">{t('schedule.anyDate')}</MenuItem><MenuItem value="overdue">{t('schedule.overdue')}</MenuItem><MenuItem value="today">{t('schedule.dueToday')}</MenuItem><MenuItem value="soon">{t('schedule.nextThreeDays')}</MenuItem><MenuItem value="week">{t('schedule.nextSevenDays')}</MenuItem></Select></FormControl>
        <FormControl size="small"><InputLabel>{t('schedule.sort')}</InputLabel><Select label={t('schedule.sort')} value={sortBy} onChange={event => onSort(event.target.value as SortOption)}><MenuItem value="updated_desc">{t('schedule.recentlyUpdated')}</MenuItem><MenuItem value="due_asc">{t('schedule.dueDate')}</MenuItem><MenuItem value="title_asc">{t('schedule.titleAZ')}</MenuItem></Select></FormControl>
      </Box>
    </Collapse>
  </>;
}
