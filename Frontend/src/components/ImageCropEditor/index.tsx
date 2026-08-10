import { Box, Button, Slider, Stack, Typography } from '@mui/material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export interface ImageCropValue { x: number; y: number; zoom: number; rotation: number }

interface Props {
  src?: string | null;
  value?: ImageCropValue | null;
  onChange: (value: ImageCropValue) => void;
  shape?: 'circle' | 'square' | 'card';
}

const centered: ImageCropValue = { x: 0, y: 0, zoom: 1, rotation: 0 };

export default function ImageCropEditor({ src, value, onChange, shape = 'circle' }: Props) {
  const { t } = useUserPreferences();
  const crop = value || centered;
  const set = (patch: Partial<ImageCropValue>) => onChange({ ...crop, ...patch });
  return (
    <Stack spacing={1.5}>
      <Box sx={{ width: '100%', maxWidth: 360, aspectRatio: shape === 'card' ? '16/10' : '1', overflow: 'hidden', borderRadius: shape === 'circle' ? '50%' : 3, bgcolor: 'action.hover', position: 'relative', mx: 'auto' }}>
        {src && <Box component="img" src={src} alt={t('feature.cropPreview')} sx={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${crop.x * 50}%, ${crop.y * 50}%) scale(${crop.zoom}) rotate(${crop.rotation}deg)`, transformOrigin: 'center', transition: 'transform 120ms ease' }} />}
      </Box>
      <Typography variant="caption">{t('feature.positionX')}</Typography>
      <Slider min={-1} max={1} step={0.01} value={crop.x} onChange={(_, x) => set({ x: x as number })} />
      <Typography variant="caption">{t('feature.positionY')}</Typography>
      <Slider min={-1} max={1} step={0.01} value={crop.y} onChange={(_, y) => set({ y: y as number })} />
      <Typography variant="caption">{t('feature.zoom')}</Typography>
      <Slider min={1} max={3} step={0.05} value={crop.zoom} onChange={(_, zoom) => set({ zoom: zoom as number })} />
      <Stack direction="row" spacing={1}>
        <Button onClick={() => set({ rotation: (crop.rotation + 90) % 360 })}>{t('feature.rotate90')}</Button>
        <Button onClick={() => onChange(centered)}>{t('feature.reset')}</Button>
      </Stack>
    </Stack>
  );
}
