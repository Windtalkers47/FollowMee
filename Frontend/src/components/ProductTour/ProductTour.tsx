import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  AutoAwesomeRounded,
  CloseRounded,
  DashboardRounded,
  SearchRounded,
  TuneRounded,
} from '@mui/icons-material';

export const REPLAY_TOUR_EVENT = 'followmee:replay-onboarding';

interface ProductTourProps {
  userKey?: string | number;
}

const steps = [
  {
    title: 'Welcome to FollowMee',
    description: 'Your customers, work and conversations now live in one calm workspace.',
    icon: <AutoAwesomeRounded />,
    hint: 'Start with Dashboard for a quick view of what needs attention.',
  },
  {
    title: 'Find anything faster',
    description: 'Use the navigation to move between posts, schedules, customers and public profiles.',
    icon: <SearchRounded />,
    hint: 'On a phone, tap the menu button. The navigation stays out of your way until you need it.',
  },
  {
    title: 'Stay focused',
    description: 'Dashboard highlights pending work while notifications bring important changes to you.',
    icon: <DashboardRounded />,
    hint: 'Dark mode is always available from the top bar.',
  },
  {
    title: 'Make it yours',
    description: 'Tune appearance and notifications in Settings, or replay this guide whenever you want.',
    icon: <TuneRounded />,
    hint: 'You are ready to explore FollowMee.',
  },
];

const ProductTour = ({ userKey = 'guest' }: ProductTourProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const storageKey = useMemo(() => `followmee:onboarding:v1:${userKey}`, [userKey]);
  const [open, setOpen] = useState(() => !localStorage.getItem(storageKey));
  const [step, setStep] = useState(0);

  useEffect(() => {
    const replay = () => {
      setStep(0);
      setOpen(true);
    };

    window.addEventListener(REPLAY_TOUR_EVENT, replay);
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, replay);
  }, []);

  const finish = () => {
    localStorage.setItem(storageKey, new Date().toISOString());
    setOpen(false);
  };

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Dialog
      open={open}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      aria-labelledby="product-tour-title"
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 5 },
          overflow: 'hidden',
          bgcolor: 'background.paper',
          backgroundImage:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 80% 0%, rgba(184, 169, 255, .18), transparent 42%)'
              : 'radial-gradient(circle at 80% 0%, rgba(184, 169, 255, .35), transparent 42%)',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(14, 18, 32, .72)',
          },
        },
      }}
    >
      <LinearProgress
        variant="determinate"
        value={((step + 1) / steps.length) * 100}
        sx={{ height: 4 }}
      />
      <IconButton
        aria-label="Close guide"
        onClick={finish}
        sx={{ position: 'absolute', top: 14, right: 14, zIndex: 1 }}
      >
        <CloseRounded />
      </IconButton>
      <DialogContent sx={{ p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            minHeight: { xs: 250, sm: 280 },
            display: 'grid',
            placeItems: 'center',
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: { xs: 210, sm: 250 },
              aspectRatio: '1.15',
              borderRadius: 5,
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              background:
                'linear-gradient(145deg, rgba(246, 218, 226, .75), rgba(215, 228, 255, .78))',
              border: '1px solid rgba(255,255,255,.8)',
              boxShadow: '0 28px 70px rgba(72, 68, 120, .22), inset 0 1px 0 white',
              transform: 'perspective(700px) rotateX(6deg) rotateY(-7deg)',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 18,
                borderRadius: 4,
                border: '1px dashed rgba(83, 75, 130, .28)',
              },
            }}
          >
            <Box sx={{ '& svg': { fontSize: 72 }, filter: 'drop-shadow(0 12px 18px rgba(91,76,180,.25))' }}>
              {current.icon}
            </Box>
          </Box>
        </Box>

        <Typography id="product-tour-title" variant="h4" fontWeight={800} textAlign="center">
          {current.title}
        </Typography>
        <Typography color="text.secondary" textAlign="center" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          {current.description}
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          sx={{
            mt: 2,
            px: 2,
            py: 1.25,
            borderRadius: 3,
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          {current.hint}
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 4 }}>
          <Button
            startIcon={<ArrowBackRounded />}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          <Stack direction="row" spacing={0.75} aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: index === step ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  bgcolor: index === step ? 'primary.main' : 'action.disabled',
                  transition: 'width .2s ease',
                }}
              />
            ))}
          </Stack>
          <Button
            variant="contained"
            endIcon={!isLast ? <ArrowForwardRounded /> : undefined}
            onClick={() => (isLast ? finish() : setStep((value) => value + 1))}
          >
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default ProductTour;
