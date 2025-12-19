import { Box, Container, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 3
    }}>
      <Container 
        maxWidth="lg" 
        sx={{ 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          color: '#2d3748',
          py: 8
        }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Typography variant="h2" component="h1" gutterBottom sx={{ 
            fontWeight: 700,
            mb: 3,
          }}>
            Welcome to FollowMee
          </Typography>
          <Typography variant="h5" component="p" sx={{ 
            mb: 4,
            maxWidth: '700px',
            color: 'text.secondary'
          }}>
            Transform your social media management with our powerful dashboard.
            Track, analyze, and grow your online presence like never before.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              size="large" 
              onClick={() => navigate('/dashboard')}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: '50px',
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(45deg, #4a6cf7 0%, #a64dff 100%)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Go to Dashboard
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              color="primary"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: '50px',
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Learn More
            </Button>
          </Box>
        </motion.div>

        {/* Features Section */}
        <Box id="features" sx={{ mt: 12, width: '100%' }}>
          <Typography variant="h3" sx={{ mb: 6, fontWeight: 600 }}>
            Powerful Features
          </Typography>
          <Box display="flex" flexWrap="wrap" justifyContent="center" gap={4}>
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
                  bgcolor="background.paper"
                  borderRadius={2}
                  boxShadow={1}
                  textAlign="center"
                  sx={{
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 3,
                    }
                  }}
                >
                  <Typography variant="h2" gutterBottom>
                    {feature.icon}
                  </Typography>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default LandingPage;