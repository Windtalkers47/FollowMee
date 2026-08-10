import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  BlurOn as BlurIcon,
  Contrast as ContrastIcon,
  BorderAll as BorderAllIcon,
  SchoolRounded as SchoolRoundedIcon,
  ExpandMoreRounded as ExpandMoreRoundedIcon,
  LanguageRounded as LanguageRoundedIcon,
  LightModeRounded as LightModeRoundedIcon,
  DarkModeRounded as DarkModeRoundedIcon,
  SettingsBrightnessRounded as SettingsBrightnessRoundedIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  selectSettings,
  selectSettingsLoading,
  fetchSettings,
  updateSettings,
} from '../../store/slices/notificationSlice';
import { useEffect } from 'react';
import { gradientPresets, GradientPresetKey } from '../../styles/liquidGlassStyles';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { REPLAY_TOUR_EVENT } from '../../components/ProductTour/ProductTour';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import feedback from '../../services/feedback.service';

// Default settings for fallback
const defaultLiquidGlassSettings = {
  gradientPreset: 'classicBluePurple' as GradientPresetKey,
  reduceTransparency: false,
  increaseContrast: false,
  addBorders: true,
};

const SettingsPage = () => {
  const { isLiquidGlassEnabled, toggleLiquidGlass, liquidGlassSettings, updateLiquidGlassSettings } = useLiquidGlass();

  // Notification settings
  const dispatch = useAppDispatch();
  const notificationSettings = useAppSelector(selectSettings);
  const settingsLoading = useAppSelector(selectSettingsLoading);
  const {
    locale,
    brandTheme,
    colorMode,
    setLocale,
    setBrandTheme,
    setColorMode,
    profileCardMotion,
    shareDefaults,
    privacyDefaults,
    setProfileCardMotion,
    setShareDefaults,
    setPrivacyDefaults,
    t,
  } = useUserPreferences();

  const savePreference = async (action: () => Promise<void>) => {
    try {
      await action();
      await feedback.success({ title: t('settings.saved'), duration: 2200, dedupeKey: 'settings-saved' });
    } catch {
      await feedback.error({ title: t('settings.saveError'), duration: 4200, dedupeKey: 'settings-save-error' });
    }
  };

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  const handleNotificationSettingChange = (setting: string, value: boolean | string | number | null) => {
    if (notificationSettings) {
      dispatch(updateSettings({ [setting]: value }));
    }
  };

  // Liquid Glass UI Settings handlers
  const handleGradientPresetChange = (preset: GradientPresetKey) => {
    updateLiquidGlassSettings({ gradientPreset: preset });
  };

  const handleReduceTransparencyChange = (value: boolean) => {
    updateLiquidGlassSettings({ reduceTransparency: value });
  };

  const handleIncreaseContrastChange = (value: boolean) => {
    updateLiquidGlassSettings({ increaseContrast: value });
  };

  const handleAddBordersChange = (value: boolean) => {
    updateLiquidGlassSettings({ addBorders: value });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" fontWeight="bold">
          {t('settings.title')}
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <LanguageRoundedIcon color="primary" />
          <Box>
            <Typography variant="h6">{t('settings.language')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('settings.languageHelp')}
            </Typography>
          </Box>
        </Box>
        <ToggleButtonGroup
          exclusive
          value={locale}
          onChange={(_event, value) => value && savePreference(() => setLocale(value))}
          aria-label={t('settings.language')}
          fullWidth
        >
          <ToggleButton value="en">{t('settings.english')}</ToggleButton>
          <ToggleButton value="th">{t('settings.thai')}</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="h6">{t('settings.theme')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('settings.themeHelp')}
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={brandTheme}
          onChange={(_event, value) => value && savePreference(() => setBrandTheme(value))}
          aria-label={t('settings.theme')}
          fullWidth
          sx={{ mb: 3 }}
        >
          <ToggleButton value="purple">{t('settings.purple')}</ToggleButton>
          <ToggleButton value="green">{t('settings.green')}</ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="h6">{t('settings.appearance')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('settings.appearanceHelp')}
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={colorMode}
          onChange={(_event, value) => value && savePreference(() => setColorMode(value))}
          aria-label={t('settings.appearance')}
          fullWidth
          sx={{ '& .MuiToggleButton-root': { gap: 1, minWidth: 0 } }}
        >
          <ToggleButton value="system"><SettingsBrightnessRoundedIcon fontSize="small" />{t('settings.system')}</ToggleButton>
          <ToggleButton value="light"><LightModeRoundedIcon fontSize="small" />{t('settings.light')}</ToggleButton>
          <ToggleButton value="dark"><DarkModeRoundedIcon fontSize="small" />{t('settings.dark')}</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">{t('settings.help')}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <SchoolRoundedIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {t('settings.productGuide')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('settings.productGuideHelp')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            onClick={() => window.dispatchEvent(new Event(REPLAY_TOUR_EVENT))}
          >
            {t('settings.replayGuide')}
          </Button>
        </Box>
      </Paper>

      {/* Liquid Glass UI Toggle */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">{t('settings.appearance')}</Typography>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          {t('settings.depthTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('settings.depthHelp')}
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={isLiquidGlassEnabled}
              onChange={toggleLiquidGlass}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body1" fontWeight={500}>
                {t('settings.enableDepth')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isLiquidGlassEnabled ? t('settings.depthActive') : t('settings.regularTheme')}
              </Typography>
            </Box>
          }
          sx={{ mb: 3 }}
        />

        {isLiquidGlassEnabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {t('settings.depthNotice')}
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Liquid Glass UI Controls */}
      {isLiquidGlassEnabled && (
        <Accordion disableGutters elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', '&::before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Box>
              <Typography variant="h6" fontWeight={600}>{t('settings.advanced')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.advancedHelp')}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
          
          <FormGroup>
            {/* Gradient Preset Selector */}
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel id="gradient-preset-label">
                <Box display="flex" alignItems="center" gap={1}>
                  <PaletteIcon fontSize="small" />
                  {t('settings.gradientPreset')}
                </Box>
              </InputLabel>
              <Select
                labelId="gradient-preset-label"
                value={liquidGlassSettings.gradientPreset || defaultLiquidGlassSettings.gradientPreset}
                label={t('settings.gradientPreset')}
                onChange={(e) => handleGradientPresetChange(e.target.value as GradientPresetKey)}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                {Object.entries(gradientPresets).map(([key, preset]) => (
                  <MenuItem key={key} value={key}>
                    {preset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Reduce Transparency Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={liquidGlassSettings.reduceTransparency || defaultLiquidGlassSettings.reduceTransparency}
                  onChange={(e) => handleReduceTransparencyChange(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <BlurIcon fontSize="small" />
                  {t('settings.reduceTransparency')}
                </Box>
              }
              sx={{ mb: 2 }}
            />

            {/* Increase Contrast Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={liquidGlassSettings.increaseContrast || defaultLiquidGlassSettings.increaseContrast}
                  onChange={(e) => handleIncreaseContrastChange(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <ContrastIcon fontSize="small" />
                  {t('settings.increaseContrast')}
                </Box>
              }
              sx={{ mb: 2 }}
            />

            {/* Add Borders Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={liquidGlassSettings.addBorders || defaultLiquidGlassSettings.addBorders}
                  onChange={(e) => handleAddBordersChange(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <BorderAllIcon fontSize="small" />
                  {t('settings.addBorders')}
                </Box>
              }
            />
          </FormGroup>

          </AccordionDetails>
        </Accordion>
      )}

      {/* Notification Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">{t('settings.notifications')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NotificationsIcon sx={{ fontSize: 24, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            {t('settings.notificationPreferences')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('settings.notificationHelp')}
        </Typography>

        {settingsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notificationSettings ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Task Notifications */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              {t('settings.taskNotifications')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyTaskAssigned}
                  onChange={(e) => handleNotificationSettingChange('notifyTaskAssigned', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.taskAssigned')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyTaskComment}
                  onChange={(e) => handleNotificationSettingChange('notifyTaskComment', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.taskComments')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyTaskLike}
                  onChange={(e) => handleNotificationSettingChange('notifyTaskLike', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.taskLikes')}
            />

            {/* Social Notifications */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              {t('settings.socialNotifications')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyCommentReply}
                  onChange={(e) => handleNotificationSettingChange('notifyCommentReply', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.commentReplies')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyCommentReaction}
                  onChange={(e) => handleNotificationSettingChange('notifyCommentReaction', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.commentReactions')}
            />

            {/* System Notifications */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              {t('settings.systemNotifications')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifySystemAlert}
                  onChange={(e) => handleNotificationSettingChange('notifySystemAlert', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.systemAlerts')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyRoleChanged}
                  onChange={(e) => handleNotificationSettingChange('notifyRoleChanged', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.roleChanges')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyProfileChanged ?? true}
                  onChange={(e) => handleNotificationSettingChange('notifyProfileChanged', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.profileChanges')}
            />

            {/* Delivery Methods */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              {t('settings.deliveryMethods')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.pushEnabled}
                  onChange={(e) => handleNotificationSettingChange('pushEnabled', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.pushNotifications')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onChange={(e) => handleNotificationSettingChange('emailEnabled', e.target.checked)}
                  color="primary"
                />
              }
              label={t('settings.emailNotifications')}
            />
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600}>{t('feature.notificationDigest')}</Typography>
            <FormControl fullWidth>
              <InputLabel>{t('feature.digest')}</InputLabel>
              <Select label={t('feature.digest')} value={notificationSettings.digestMode || 'none'} onChange={(event) => handleNotificationSettingChange('digestMode', event.target.value)}>
                <MenuItem value="none">{t('feature.off')}</MenuItem><MenuItem value="daily">{t('feature.daily')}</MenuItem><MenuItem value="weekly">{t('feature.weekly')}</MenuItem>
              </Select>
            </FormControl>
            {notificationSettings.digestMode !== 'none' && <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: notificationSettings.digestMode === 'weekly' ? '1fr 1fr' : '1fr' }} gap={2}>
              {notificationSettings.digestMode === 'weekly' && <FormControl><InputLabel>{t('feature.day')}</InputLabel><Select label={t('feature.day')} value={notificationSettings.digestDay ?? 1} onChange={(event) => handleNotificationSettingChange('digestDay', Number(event.target.value))}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, index) => <MenuItem key={day} value={index}>{day}</MenuItem>)}</Select></FormControl>}
              <TextField type="time" label={t('feature.deliveryTime')} InputLabelProps={{ shrink: true }} value={notificationSettings.digestTime || '08:00'} onChange={(event) => handleNotificationSettingChange('digestTime', event.target.value)} />
            </Box>}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('settings.notificationLoadError')}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">{t('feature.profileSharing')}</Typography>
        <Typography variant="h6" mb={2}>{t('feature.cardExperience')}</Typography>
        <FormControl fullWidth sx={{ mb: 2 }}><InputLabel>{t('feature.motion')}</InputLabel><Select label={t('feature.motion')} value={profileCardMotion} onChange={(event) => savePreference(() => setProfileCardMotion(event.target.value as 'full' | 'subtle' | 'off'))}><MenuItem value="full">{t('feature.full')}</MenuItem><MenuItem value="subtle">{t('feature.subtle')}</MenuItem><MenuItem value="off">{t('feature.off')}</MenuItem></Select></FormControl>
        <FormControlLabel control={<Switch checked={shareDefaults.badge !== false} onChange={(_, checked) => savePreference(() => setShareDefaults({ ...shareDefaults, badge: checked }))} />} label={t('feature.showBadgeShare')} />
        <FormControlLabel control={<Switch checked={shareDefaults.score !== false} onChange={(_, checked) => savePreference(() => setShareDefaults({ ...shareDefaults, score: checked }))} />} label={t('feature.showScoreShare')} />
        <FormControl fullWidth sx={{ mt: 2 }}><InputLabel>{t('feature.defaultVisibility')}</InputLabel><Select label={t('feature.defaultVisibility')} value={String(privacyDefaults.visibility || 'private')} onChange={(event) => savePreference(() => setPrivacyDefaults({ ...privacyDefaults, visibility: event.target.value }))}><MenuItem value="private">{t('feature.private')}</MenuItem><MenuItem value="unlisted">{t('feature.unlisted')}</MenuItem><MenuItem value="public">{t('feature.public')}</MenuItem></Select></FormControl>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary">{t('settings.account')}</Typography>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          {t('settings.accountSecurity')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('settings.accountHelp')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
