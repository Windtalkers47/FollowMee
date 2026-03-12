import React from 'react';
import {
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

interface LiquidGlassSettingsProps {
  glassOpacity: number;
  setGlassOpacity: (value: number) => void;
  showBorders: boolean;
  setShowBorders: (value: boolean) => void;
  blurIntensity: number;
  setBlurIntensity: (value: number) => void;
  glassStyle: 'subtle' | 'medium' | 'bold';
  setGlassStyle: (value: 'subtle' | 'medium' | 'bold') => void;
  contrastLevel: number;
  setContrastLevel: (value: number) => void;
}

const LiquidGlassSettings: React.FC<LiquidGlassSettingsProps> = ({
  glassOpacity,
  setGlassOpacity,
  showBorders,
  setShowBorders,
  blurIntensity,
  setBlurIntensity,
  glassStyle,
  setGlassStyle,
  contrastLevel,
  setContrastLevel,
}) => {
  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 3,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <SettingsIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="h6" fontWeight={600} color="text.primary">
          Liquid Glass Controls
        </Typography>
      </Stack>

      <Stack spacing={2.5}>
        {/* Glass Style Preset */}
        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Style Preset
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={glassStyle}
              onChange={(e) => setGlassStyle(e.target.value as 'subtle' | 'medium' | 'bold')}
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <MenuItem value="subtle">Subtle - Light & Ethereal</MenuItem>
              <MenuItem value="medium">Medium - Balanced</MenuItem>
              <MenuItem value="bold">Bold - Strong Glass</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Transparency Control */}
        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Transparency: {Math.round((1 - glassOpacity) * 100)}%
          </Typography>
          <Slider
            value={glassOpacity}
            onChange={(_, value) => setGlassOpacity(value as number)}
            min={0.1}
            max={0.95}
            step={0.05}
            marks={[
              { value: 0.1, label: '90%' },
              { value: 0.3, label: '70%' },
              { value: 0.5, label: '50%' },
              { value: 0.7, label: '30%' },
              { value: 0.9, label: '10%' },
            ]}
            sx={{
              '& .MuiSlider-thumb': {
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              },
              '& .MuiSlider-track': {
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              },
            }}
          />
        </Box>

        {/* Blur Intensity */}
        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Blur Intensity: {blurIntensity}px
          </Typography>
          <Slider
            value={blurIntensity}
            onChange={(_, value) => setBlurIntensity(value as number)}
            min={0}
            max={40}
            step={2}
            marks={[
              { value: 0, label: 'None' },
              { value: 10, label: 'Light' },
              { value: 20, label: 'Medium' },
              { value: 30, label: 'Strong' },
              { value: 40, label: 'Max' },
            ]}
            sx={{
              '& .MuiSlider-thumb': {
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              },
              '& .MuiSlider-track': {
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              },
            }}
          />
        </Box>

        {/* Contrast Level */}
        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Text Contrast: {Math.round(contrastLevel * 100)}%
          </Typography>
          <Slider
            value={contrastLevel}
            onChange={(_, value) => setContrastLevel(value as number)}
            min={0.3}
            max={1.0}
            step={0.05}
            marks={[
              { value: 0.3, label: 'Low' },
              { value: 0.5, label: 'Medium' },
              { value: 0.7, label: 'High' },
              { value: 1.0, label: 'Max' },
            ]}
            sx={{
              '& .MuiSlider-thumb': {
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              },
              '& .MuiSlider-track': {
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              },
            }}
          />
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Borders Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={showBorders}
              onChange={(e) => setShowBorders(e.target.checked)}
              sx={{
                '& .MuiSwitch-thumb': {
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                },
                '& .MuiSwitch-track': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                },
              }}
            />
          }
          label={
            <Typography variant="body2" fontWeight={500}>
              Show Element Borders
            </Typography>
          }
        />
      </Stack>
    </Paper>
  );
};

export default LiquidGlassSettings;
