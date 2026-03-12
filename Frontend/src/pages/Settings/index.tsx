import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import LiquidGlassSettings from '../../components/LiquidGlassSettings';

const SettingsPage = () => {
  const { isLiquidGlassEnabled, toggleLiquidGlass, liquidGlassSettings, updateLiquidGlassSettings } = useLiquidGlass();

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
