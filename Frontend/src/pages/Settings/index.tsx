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
    t,
  } = useUserPreferences();

  const savePreference = async (action: () => Promise<void>) => {
    try {
      await action();
      await feedback.fire({ icon: 'success', title: t('settings.saved'), toast: true, timer: 2200 });
    } catch {
      await feedback.fire({ icon: 'error', title: t('settings.saveError'), toast: true, timer: 4200 });
    }
  };

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  const handleNotificationSettingChange = (setting: string, value: boolean) => {
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
        <Typography variant="overline" color="text.secondary">Help</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <SchoolRoundedIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Product guide
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Replay the introduction to navigation, notifications and appearance controls.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            onClick={() => window.dispatchEvent(new Event(REPLAY_TOUR_EVENT))}
          >
            Replay guide
          </Button>
        </Box>
      </Paper>

      {/* Liquid Glass UI Toggle */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">Appearance</Typography>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Depth & transparency effects
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add subtle depth to navigation and feature surfaces. Reading areas stay clear and high contrast.
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
                Enable depth effects
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isLiquidGlassEnabled ? 'Enhanced theme is active' : 'Using regular theme'}
              </Typography>
            </Box>
          }
          sx={{ mb: 3 }}
        />

        {isLiquidGlassEnabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Depth effects are active.</strong> Advanced appearance controls are available below.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Liquid Glass UI Controls */}
      {isLiquidGlassEnabled && (
        <Accordion disableGutters elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', '&::before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Box>
              <Typography variant="h6" fontWeight={600}>Advanced appearance</Typography>
              <Typography variant="body2" color="text.secondary">
                Fine-tune visual effects and accessibility. Most users can keep the defaults.
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
                  Gradient Preset
                </Box>
              </InputLabel>
              <Select
                labelId="gradient-preset-label"
                value={liquidGlassSettings.gradientPreset || defaultLiquidGlassSettings.gradientPreset}
                label="Gradient Preset"
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
                  Reduce Transparency
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
                  Increase Contrast
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
                  Add Borders
                </Box>
              }
            />
          </FormGroup>

          </AccordionDetails>
        </Accordion>
      )}

      {/* Notification Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">Notifications</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NotificationsIcon sx={{ fontSize: 24, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Notification preferences
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose which notifications you want to receive and how they're delivered.
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
              Task Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyTaskAssigned}
                  onChange={(e) => handleNotificationSettingChange('notifyTaskAssigned', e.target.checked)}
                  color="primary"
                />
              }
              label="Task assigned to me"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyTaskComment}
                  onChange={(e) => handleNotificationSettingChange('notifyTaskComment', e.target.checked)}
                  color="primary"
                />
              }
              label="Comments on my tasks"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyTaskLike}
                  onChange={(e) => handleNotificationSettingChange('notifyTaskLike', e.target.checked)}
                  color="primary"
                />
              }
              label="Likes on my tasks"
            />

            {/* Social Notifications */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              Social Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyCommentReply}
                  onChange={(e) => handleNotificationSettingChange('notifyCommentReply', e.target.checked)}
                  color="primary"
                />
              }
              label="Replies to my comments"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyCommentReaction}
                  onChange={(e) => handleNotificationSettingChange('notifyCommentReaction', e.target.checked)}
                  color="primary"
                />
              }
              label="Reactions to my comments"
            />

            {/* System Notifications */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              System Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifySystemAlert}
                  onChange={(e) => handleNotificationSettingChange('notifySystemAlert', e.target.checked)}
                  color="primary"
                />
              }
              label="System alerts and announcements"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.notifyRoleChanged}
                  onChange={(e) => handleNotificationSettingChange('notifyRoleChanged', e.target.checked)}
                  color="primary"
                />
              }
              label="Role changes"
            />

            {/* Delivery Methods */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              Delivery Methods
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.pushEnabled}
                  onChange={(e) => handleNotificationSettingChange('pushEnabled', e.target.checked)}
                  color="primary"
                />
              }
              label="Push notifications (in-app)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onChange={(e) => handleNotificationSettingChange('emailEnabled', e.target.checked)}
                  color="primary"
                />
              }
              label="Email notifications"
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Unable to load notification settings.
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary">Account</Typography>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Account & security
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Profile details and role access are managed from the account menu. Contact a Super Admin to change permissions.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
