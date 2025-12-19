import { Box, Container, Typography, Button, Avatar, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Mock users data for social proof section
const users = [
  { id: 1, name: 'Alex Johnson', role: 'Social Media Manager', avatar: 'AJ' },
  { id: 2, name: 'Maria Garcia', role: 'Digital Marketer', avatar: 'MG' },
  { id: 3, name: 'James Wilson', role: 'Content Creator', avatar: 'JW' },
  { id: 4, name: 'Sarah Chen', role: 'Brand Manager', avatar: 'SC' },
];

// Social proof data is now directly used in the component

// Mock features data
const features = [
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'Get insights into your social media performance with beautiful visualizations.'
  },
  {
    icon: '💬',
    title: 'Engagement Tools',
    description: 'Connect with your audience and grow your following with our engagement tools.'
  },
  {
    icon: '⏰',
    title: 'Smart Scheduling',
    description: 'Plan and schedule your content in advance for maximum impact.'
  },
  {
    icon: '📱',
    title: 'Multi-Platform',
    description: 'Manage all your social media accounts from one powerful dashboard.'
  },
  {
    icon: '🎯',
    title: 'Audience Insights',
    description: 'Understand your audience better with detailed demographic and behavioral data.'
  },
  {
    icon: '📈',
    title: 'Performance Reports',
    description: 'Track your growth and performance with comprehensive reports.'
  }
];

// Social Proof Component
const SocialProof = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      py: 10,
      bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
      borderTop: `1px solid ${theme.palette.divider}`,
      borderBottom: `1px solid ${theme.palette.divider}`
    }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h2" align="center" sx={{ mb: 6, fontWeight: 700 }}>
          Trusted by Social Media Professionals
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, width: '100%' }}>
          {users.map((user) => (
            <Box 
              key={user.id}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 3,
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '1.5rem',
                  fontWeight: 600
                }}
              >
                {user.avatar}
              </Avatar>
              <Typography variant="h6" component="h3" gutterBottom>
                {user.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.role}
              </Typography>
              <Box sx={{ mt: 2, color: 'gold' }}>
                {'★'.repeat(5)}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.875rem' }}>
                "FollowMee transformed how we manage our social media!"
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

// Features Component
const Features = () => {
  const theme = useTheme();
  
  return (
    <Box id="features" sx={{ py: 10, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 2, fontWeight: 700 }}>
            Powerful Features
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
            Everything you need to manage your social media presence effectively
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
          gap: 4,
          width: '100%'
        }}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Box sx={{
                p: 4,
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 3,
                }
              }}>
                <Typography variant="h2" sx={{ mb: 2 }}>
                  {feature.icon}
                </Typography>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">
                  {feature.description}
                </Typography>
              </Box>
            </motion.div>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

// Footer Component
const Footer = () => {
  const theme = useTheme();
  
  return (
    <Box component="footer" sx={{
      py: 6,
      bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
      borderTop: `1px solid ${theme.palette.divider}`
    }}>
      <Container maxWidth="lg">
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(5, 1fr)' 
          },
          gap: 4,
          mb: 4
        }}>
          <Box sx={{ 
            gridColumn: { xs: '1 / -1', md: '1 / 3' },
            maxWidth: { md: '80%' }
          }}>
            <Typography variant="h6" gutterBottom>FollowMee</Typography>
            <Typography variant="body2" color="text.secondary">
              The all-in-one social media management platform that helps you grow your online presence.
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>Product</Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Features</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Pricing</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>API</Typography></li>
            </Box>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>Company</Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>About</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Blog</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Careers</Typography></li>
            </Box>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>Resources</Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Documentation</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Guides</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Support</Typography></li>
            </Box>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>Legal</Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Privacy</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Terms</Typography></li>
              <li><Typography component="a" href="#" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 1 }}>Security</Typography></li>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} FollowMee. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const element = document.getElementById('features');
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth' as ScrollBehavior
      });
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '800px',
        height: '800px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(166,115,227,0.1) 0%, rgba(110,142,251,0.05) 70%, transparent 100%)',
        top: '-400px',
        right: '-200px',
        zIndex: 0,
        [theme.breakpoints.down('md')]: {
          width: '500px',
          height: '500px',
          top: '-200px',
          right: '-100px',
        }
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(110,142,251,0.1) 0%, rgba(166,115,227,0.05) 70%, transparent 100%)',
        bottom: '-300px',
        left: '-150px',
        zIndex: 0,
        [theme.breakpoints.down('md')]: {
          width: '400px',
          height: '400px',
          bottom: '-200px',
          left: '-100px',
        }
      }
    }}>
      {/* Hero Section */}
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)',
          zIndex: 0,
        }
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                fontWeight: 800,
                lineHeight: 1.2,
                mb: 3,
                textAlign: 'center',
                color: '#2d3748',
                background: 'linear-gradient(45deg, #4a6cf7 0%, #a64dff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
                width: '100%'
              }}
            >
              Welcome to FollowMee
            </Typography>
            
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 4,
                color: 'text.secondary',
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: '800px',
                mx: 'auto',
                px: 2
              }}
            >
              Transform your social media management with our powerful dashboard.
              Track, analyze, and grow your online presence like never before.
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              justifyContent: 'center',
              flexWrap: 'wrap',
              mt: 6
            }}>
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
                onClick={scrollToFeatures}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '50px',
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderWidth: '2px',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    borderWidth: '2px',
                    backgroundColor: 'rgba(106, 17, 203, 0.04)'
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Learn More
              </Button>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Social Proof Section */}
      <SocialProof />

      {/* Features Section */}
      <Features />
      
      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default LandingPage;
