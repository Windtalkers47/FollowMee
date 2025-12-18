import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { styled } from '@mui/material/styles';

const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  padding: theme.spacing(3),
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  position: 'relative',
  overflow: 'hidden',
}));

const Title = styled(motion.h1)(({ theme }) => ({
  fontSize: '4rem',
  fontWeight: 700,
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.main,
  [theme.breakpoints.down('md')]: {
    fontSize: '3rem',
  },
}));

const Subtitle = styled(motion.p)(({ theme }) => ({
  fontSize: '1.5rem',
  marginBottom: theme.spacing(4),
  color: theme.palette.text.secondary,
  maxWidth: '800px',
}));

const CTAButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 4),
  fontSize: '1.1rem',
  borderRadius: '50px',
  textTransform: 'none',
  fontWeight: 600,
  margin: theme.spacing(1),
}));

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <HeroSection>
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Title>Welcome to FollowMee</Title>
            <Subtitle>
              Transform your social media management with our powerful dashboard.
              Track, analyze, and grow your online presence like never before.
            </Subtitle>
            <Box>
              <CTAButton
                variant="contained"
                color="primary"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{ mr: 2 }}
              >
                Go to Dashboard
              </CTAButton>
              <CTAButton
                variant="outlined"
                color="primary"
                size="large"
                onClick={() => {
                  // Smooth scroll to features section
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
              </CTAButton>
            </Box>
          </motion.div>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <Box id="features" py={10} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            Powerful Features
          </Typography>
          <Box display="flex" flexWrap="wrap" justifyContent="center" mt={6} gap={4}>
            {[
              {
                title: 'Analytics Dashboard',
                description: 'Get insights into your social media performance with beautiful visualizations.',
                icon: '📊',
              },
              {
                title: 'Engagement Tools',
                description: 'Connect with your audience and grow your following with our engagement tools.',
                icon: '💬',
              },
              {
                title: 'Scheduling',
                description: 'Plan and schedule your content in advance for maximum impact.',
                icon: '⏰',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * index }}
                style={{ flex: '1 1 300px', maxWidth: '350px' }}
              >
                <Box
                  p={4}
                  height="100%"
                  bgcolor="background.default"
                  borderRadius={2}
                  boxShadow={1}
                  textAlign="center"
                >
                  <Typography variant="h2" gutterBottom>
                    {feature.icon}
                  </Typography>
                  <Typography variant="h5" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography color="textSecondary">
                    {feature.description}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
