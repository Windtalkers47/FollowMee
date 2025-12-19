import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  Avatar, 
  IconButton,
  useTheme,
  Button,
  useMediaQuery
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Favorite as FavoriteIcon, 
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Share as ShareIcon,
  MoreHoriz as MoreHorizIcon
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [posts, setPosts] = React.useState([
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
      username: 'taylor_swift',
      name: 'Taylor Swift',
      avatar: 'TS',
      content: 'The analytics from @FollowMee helped me understand my audience better than ever before! #DataDriven',
      likes: 4567,
      comments: 321,
      shares: 189,
      time: '5h ago',
      isLiked: true,
      media: 'https://source.unsplash.com/random/800x600?concert,music'
    },
    {
      username: 'tech_enthusiast',
      name: 'Tech Enthusiast',
      avatar: 'TE',
      content: 'If you\'re serious about growing your social presence, you need @FollowMee in your toolkit. Game changer!',
      likes: 892,
      comments: 45,
      shares: 23,
      time: '1d ago',
      isLiked: false,
      media: 'https://source.unsplash.com/random/800x600?tech,app'
    }
  ]);
  
  // Intersection Observer for scroll animations
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

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
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => 
        prevIndex === posts.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [posts.length]);

  const handleLike = (index: number) => {
    setPosts(prevPosts => {
      const newPosts = [...prevPosts];
      newPosts[index] = {
        ...newPosts[index],
        isLiked: !newPosts[index].isLiked,
        likes: newPosts[index].isLiked 
          ? newPosts[index].likes - 1 
          : newPosts[index].likes + 1
      };
      return newPosts;
    });
  };

  return (
    <Box 
      ref={containerRef}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 4, md: 8 },
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            mb: 6,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography
              variant="h3"
              component="h2"
              sx={{
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
              }}
            >
              Join Our Growing Community
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: '700px',
                mx: 'auto',
                mb: 4,
                fontSize: { xs: '1rem', sm: '1.1rem' },
              }}
            >
              Trusted by thousands of creators and businesses worldwide
            </Typography>
          </motion.div>
        </Box>
        <Box
          sx={{
            position: 'relative',
            maxWidth: '600px',
            mx: 'auto',
            mb: 8,
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: 6,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4 }}
              style={{ height: '100%' }}
            >
              <Card
                sx={{
                  borderRadius: 0,
                  boxShadow: 'none',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      mr: 1.5,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontWeight: 600,
                    }}
                  >
                    {posts[activeIndex].avatar}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {posts[activeIndex].name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      @{posts[activeIndex].username} • {posts[activeIndex].time}
                    </Typography>
                  </Box>
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <MoreHorizIcon />
                  </IconButton>
                </Box>

                <Box sx={{ p: 3, flex: 1 }}>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {posts[activeIndex].content}
                  </Typography>
                  
                  <Box
                    component={motion.div}
                    sx={{
                      position: 'relative',
                      borderRadius: 2,
                      overflow: 'hidden',
                      height: '400px',
                      bgcolor: 'action.hover',
                      mb: 2,
                    }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <Box
                      component="img"
                      src={posts[activeIndex].media}
                      alt="Post media"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease-in-out',
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleLike(activeIndex)}
                    sx={{
                      color: posts[activeIndex].isLiked ? 'error.main' : 'text.secondary',
                      '&:hover': {
                        color: 'error.main',
                        transform: 'scale(1.1)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <FavoriteIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <ChatBubbleOutlineIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <ShareIcon />
                  </IconButton>
                  <Box sx={{ flex: 1 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <FavoriteIcon fontSize="inherit" color={posts[activeIndex].isLiked ? 'error' : 'disabled'} sx={{ fontSize: '1rem' }} />
                    {posts[activeIndex].likes.toLocaleString()}
                    <Box component="span" mx={0.5}>•</Box>
                    <ChatBubbleOutlineIcon fontSize="inherit" color="disabled" sx={{ fontSize: '1rem' }} />
                    {posts[activeIndex].comments}
                  </Typography>
                </Box>
              </Card>
            </motion.div>
          </AnimatePresence>
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
            {new Date().getFullYear()} FollowMee. All rights reserved.
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
