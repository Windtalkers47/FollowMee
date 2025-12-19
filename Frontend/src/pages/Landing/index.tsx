import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  Avatar, 
  IconButton ,
  useTheme,
  Button
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Favorite as FavoriteIcon, 
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Share as ShareIcon,
  Instagram as InstagramIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Create a motion component for Card
const MotionCard = motion(Card);

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

const SocialProof = () => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);

  const socialPosts = [
    {
      username: 'alex_johnson',
      name: 'Alex Johnson',
      avatar: 'AJ',
      content: 'Just hit 10K followers with @FollowMee! The engagement tools are next level 🚀 #SocialMediaGrowth',
      likes: 1243,
      comments: 89,
      shares: 45,
      time: '2h ago',
      isLiked: false,
      media: 'https://source.unsplash.com/random/800x600?social,media,post'
    },
    {
      username: 'sarah_creates',
      name: 'Sarah Chen',
      avatar: 'SC',
      content: 'The analytics dashboard is a game-changer! 87% increase in engagement this month. Thanks @FollowMee! 📈',
      likes: 892,
      comments: 42,
      shares: 31,
      time: '5h ago',
      isLiked: true,
      media: 'https://source.unsplash.com/random/800x600?analytics,dashboard'
    },
    {
      username: 'mike_social',
      name: 'Michael Brown',
      avatar: 'MB',
      content: 'Scheduling posts has never been easier. Just set it and forget it with @FollowMee! #TimeSaver',
      likes: 567,
      comments: 23,
      shares: 12,
      time: '1d ago',
      isLiked: false,
      media: 'https://source.unsplash.com/random/800x600?schedule,planning'
    }
  ];

  // Auto-rotate posts
  React.useEffect(() => {
    if (isHovered) return;
    
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % socialPosts.length);
    }, 8000);
    
    return () => clearInterval(timer);
  }, [isHovered, socialPosts.length]);

  const handleLike = (index: number) => {
    // In a real app, this would update the backend
    socialPosts[index].isLiked = !socialPosts[index].isLiked;
    socialPosts[index].likes += socialPosts[index].isLiked ? 1 : -1;
  };

  return (
    <Box 
      component="section" 
      sx={{ 
        py: { xs: 6, md: 10 },
        background: theme.palette.background.default,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Floating social icons */}
      <Box sx={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        display: { xs: 'none', lg: 'block' },
        opacity: 0.1,
        zIndex: 0
      }}>
        <InstagramIcon sx={{ fontSize: 150, color: theme.palette.primary.main }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box textAlign="center" mb={8}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800,
              mb: 2,
              background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}
          >
            #FollowMeeInAction
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.6
            }}
          >
            See what our community is saying about their social media success
          </Typography>
        </Box>

        <Box 
          sx={{ 
            maxWidth: '600px',
            mx: 'auto',
            position: 'relative',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: theme.shadows[8],
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Card elevation={0} sx={{ borderRadius: 0, border: 'none' }}>
                {/* Post Header */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Avatar 
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      fontWeight: 600,
                      mr: 2
                    }}
                  >
                    {socialPosts[activeIndex].avatar}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{socialPosts[activeIndex].name}</Typography>
                    <Typography variant="caption" color="text.secondary">@{socialPosts[activeIndex].username} • {socialPosts[activeIndex].time}</Typography>
                  </Box>
                </Box>

                {/* Post Content */}
                <Box sx={{ p: 3, pb: 2 }}>
                  <Typography>{socialPosts[activeIndex].content}</Typography>
                </Box>

                {/* Post Media */}
                <Box 
                  sx={{ 
                    height: '300px', 
                    background: `url(${socialPosts[activeIndex].media}) center/cover no-repeat`,
                    position: 'relative'
                  }}
                />

                {/* Post Actions */}
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <IconButton 
                      size="small" 
                      color={socialPosts[activeIndex].isLiked ? 'error' : 'default'}
                      onClick={() => handleLike(activeIndex)}
                    >
                      <FavoriteIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <ChatBubbleOutlineIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {socialPosts[activeIndex].likes.toLocaleString()} likes • {socialPosts[activeIndex].comments} comments
                  </Typography>
                </Box>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Dots */}
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: 'background.paper' }}>
            {socialPosts.map((_, index) => (
              <Box
                key={index}
                onClick={() => setActiveIndex(index)}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: index === activeIndex ? 'primary.main' : 'action.disabled',
                  mx: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    transform: 'scale(1.2)'
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Social Proof Stats */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 3,
            mt: 8,
            textAlign: 'center'
          }}
        >
          {[
            { value: '10K+', label: 'Active Users' },
            { value: '95%', label: 'Satisfaction' },
            { value: '4.9/5', label: 'Rating' },
            { value: '24/7', label: 'Support' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </motion.div>
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
