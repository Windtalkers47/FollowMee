import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Settings as SettingsIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import LiquidGlassSettings from '../../components/LiquidGlassSettings';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  selectSettings,
  selectSettingsLoading,
  fetchSettings,
  updateSettings,
} from '../../store/slices/notificationSlice';
import { useEffect } from 'react';

const SettingsPage = () => {
  const { isLiquidGlassEnabled, toggleLiquidGlass, liquidGlassSettings, updateLiquidGlassSettings } = useLiquidGlass();

  // Notification settings
  const dispatch = useAppDispatch();
  const notificationSettings = useAppSelector(selectSettings);
  const settingsLoading = useAppSelector(selectSettingsLoading);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  const handleNotificationSettingChange = (setting: string, value: boolean) => {
    if (notificationSettings) {
      dispatch(updateSettings({ [setting]: value }));
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" fontWeight="bold">
          Settings
        </Typography>
      </Box>

      {/* Liquid Glass UI Toggle */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Enhanced Liquid Glass UI
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enable the iOS-style Liquid Glass UI with customizable transparency, blur, and visual effects.
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
                Enable Liquid Glass UI
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
              🎨 <strong>Liquid Glass UI is now active!</strong> Customize the appearance below with adjustable transparency, blur intensity, borders, and more.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Liquid Glass UI Controls */}
      {isLiquidGlassEnabled && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Liquid Glass Controls
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Fine-tune the visual appearance with these controls:
          </Typography>
          
          <LiquidGlassSettings
            glassOpacity={liquidGlassSettings.glassOpacity}
            setGlassOpacity={(value) => updateLiquidGlassSettings({ glassOpacity: value })}
            showBorders={liquidGlassSettings.showBorders}
            setShowBorders={(value) => updateLiquidGlassSettings({ showBorders: value })}
            blurIntensity={liquidGlassSettings.blurIntensity}
            setBlurIntensity={(value) => updateLiquidGlassSettings({ blurIntensity: value })}
            glassStyle={liquidGlassSettings.glassStyle}
            setGlassStyle={(value) => updateLiquidGlassSettings({ glassStyle: value })}
            contrastLevel={liquidGlassSettings.contrastLevel}
            setContrastLevel={(value) => updateLiquidGlassSettings({ contrastLevel: value })}
          />
        </Paper>
      )}

      {/* Notification Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NotificationsIcon sx={{ fontSize: 24, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Notification Settings
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

      {/* Other Settings Sections */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Account Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account preferences and security settings.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          More settings coming soon...
        </Typography>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
