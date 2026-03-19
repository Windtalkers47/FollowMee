import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Facebook,
  Instagram,
  MusicNote,
  Message,
  Twitter,
} from '@mui/icons-material';
import { CustomerData } from '@/types/customer.types';
import { isValidCloudinaryUrl, isLikelyInvalidImage, generateFallbackAvatar } from '@/utils/imageUtils';

interface ProfileImageContentProps {
  customer: CustomerData;
  selectedGradient: number;
  gradientPresets: Array<{ name: string; colors: string[] }>;
}

const ProfileImageContent: React.FC<ProfileImageContentProps> = ({
  customer,
  selectedGradient,
  gradientPresets,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const hasSocialMedia = customer.customerFacebook || customer.customerInstagram || 
                       customer.customerTikTok || customer.customerLine || customer.customerX;

  // State to track if image is valid
  const [isImageValid, setIsImageValid] = useState(false);
  const [safeImage, setSafeImage] = useState('');
  
  // Generate fallback avatar URL
  const fallbackAvatarUrl = generateFallbackAvatar(
    `${customer.customerName} ${customer.customerLastName}`,
    420
  );

  // Convert image to base64 to eliminate CORS issues
  const toBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return '';
    }
  };

  // Pre-validate Cloudinary image and convert to base64
  useEffect(() => {
    if (customer.customerImageUrl && isValidCloudinaryUrl(customer.customerImageUrl)) {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Add CORS attribute
      
      // Set a timeout to handle hanging requests
      const timeout = setTimeout(() => {
        setIsImageValid(false);
        setImageError(true);
        setImageLoading(false);
      }, 5000); // 5 second timeout
      
      img.onload = async () => {
        clearTimeout(timeout);
        // Double-check image dimensions to ensure it's valid
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setIsImageValid(true);
          setImageLoading(false);
          // Convert to base64 for safe canvas rendering
          const base64 = await toBase64(customer.customerImageUrl!);
          if (base64) {
            setSafeImage(base64);
          }
        } else {
          setIsImageValid(false);
          setImageError(true);
          setImageLoading(false);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        setIsImageValid(false);
        setImageError(true);
        setImageLoading(false);
      };
      
      img.src = customer.customerImageUrl;
    } else {
      setIsImageValid(false);
      setImageLoading(false);
    }
  }, [customer.customerImageUrl]);

  // Determine which image source to use (prefer base64 for canvas safety)
  const imageSource = safeImage || (isImageValid && !imageError ? (customer.customerImageUrl || fallbackAvatarUrl) : fallbackAvatarUrl);

  return (
    <Box
      sx={{
        width: '1080px',
        height: '1920px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        background: `linear-gradient(160deg, ${gradientPresets[selectedGradient].colors.join(', ')})`,
        zIndex: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 10,
      }}
    >
      {/* Glow Effect */}
      <Box
        sx={{
          position: 'absolute',
          width: 800,
          height: 800,
          background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent)',
          filter: 'blur(80px)',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 0,
        }}
      />

      {/* Gradient Background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          width: '1080px',
          height: '1920px',
          borderRadius: 4
        }}
      />

      {/* Top Section - Hook */}
      <Box sx={{ textAlign: 'center', zIndex: 1 }}>
        <Typography
          sx={{
            color: 'white',
            fontSize: 42,
            fontWeight: 500,
            letterSpacing: 2,
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          Let's Connect
        </Typography>
      </Box>

      {/* Middle Section - Profile Picture & Name */}
      <Box sx={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
        {/* Radial Light Background */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.25), transparent 70%)',
            borderRadius: '50%',
            zIndex: 0,
          }}
        />
        <Avatar
          src={imageSource}
          imgProps={{ crossOrigin: 'anonymous' }}
          alt={`${customer.customerName} ${customer.customerLastName}`}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setIsImageValid(false);
            setImageLoading(false);
          }}
          sx={{
            width: 420,
            height: 420,
            border: '6px solid rgba(255,255,255,0.9)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            position: 'relative',
            zIndex: 1,
            mx: 'auto',
            mb: 4,
            // Add loading state styling
            ...(imageLoading && {
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
              }
            })
          }}
        >
          {(!isImageValid || imageError) && (
            <Typography sx={{ fontSize: 120, fontWeight: 700, color: '#1f2937' }}>
              {customer.customerName?.charAt(0).toUpperCase()}
              {customer.customerLastName?.charAt(0).toUpperCase()}
            </Typography>
          )}
        </Avatar>
        
        <Typography
          sx={{
            color: 'white',
            fontSize: 72,
            fontWeight: 800,
            textAlign: 'center',
            textShadow: '0 4px 12px rgba(0,0,0,0.4)',
            mt: 4,
          }}
        >
          {customer.customerName}
        </Typography>
        
        {customer.customerLastName && (
          <Typography
            sx={{
              color: 'white',
              fontSize: 72,
              fontWeight: 800,
              textAlign: 'center',
              textShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            {customer.customerLastName}
          </Typography>
        )}
      </Box>

      {/* Bottom Section - Social Media & CTA */}
      <Box sx={{ textAlign: 'center', zIndex: 1 }}>
        {hasSocialMedia && (
          <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', mb: 6 }}>
            {customer.customerFacebook && (
              <Tooltip title="Facebook" arrow>
                <IconButton
                  size="large"
                  href={customer.customerFacebook}
                  target="_blank"
                  sx={{
                    bgcolor: '#1877F2',
                    color: 'white',
                    '&:hover': { bgcolor: '#166FE5' },
                    width: 80,
                    height: 80,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <Facebook fontSize="large" />
                </IconButton>
              </Tooltip>
            )}
            {customer.customerInstagram && (
              <Tooltip title="Instagram" arrow>
                <IconButton
                  size="large"
                  href={customer.customerInstagram}
                  target="_blank"
                  sx={{
                    background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%,#d6249f 60%,#285AEB 90%)',
                    color: 'white',
                    '&:hover': { opacity: 0.9 },
                    width: 80,
                    height: 80,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <Instagram fontSize="large" />
                </IconButton>
              </Tooltip>
            )}
            {customer.customerTikTok && (
              <Tooltip title="TikTok" arrow>
                <IconButton
                  size="large"
                  href={customer.customerTikTok}
                  target="_blank"
                  sx={{
                    bgcolor: '#000000',
                    color: 'white',
                    '&:hover': { bgcolor: '#333333' },
                    width: 80,
                    height: 80,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <MusicNote fontSize="large" />
                </IconButton>
              </Tooltip>
            )}
            {customer.customerLine && (
              <Tooltip title="Line" arrow>
                <IconButton
                  size="large"
                  href={`https://line.me/ti/p/${customer.customerLine}`}
                  target="_blank"
                  sx={{
                    bgcolor: '#06C755',
                    color: 'white',
                    '&:hover': { bgcolor: '#05a548' },
                    width: 80,
                    height: 80,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <Message fontSize="large" />
                </IconButton>
              </Tooltip>
            )}
            {customer.customerX && (
              <Tooltip title="X (Twitter)" arrow>
                <IconButton
                  size="large"
                  href={customer.customerX}
                  target="_blank"
                  sx={{
                    bgcolor: '#000000',
                    color: 'white',
                    '&:hover': { bgcolor: '#333333' },
                    width: 80,
                    height: 80,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <Twitter fontSize="large" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* CTA */}
        <Typography
          sx={{
            color: 'white',
            fontSize: 36,
            mt: 6,
            opacity: 0.9,
          }}
        >
          Tap to explore my profile
        </Typography>

        {/* Branding */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography
            sx={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 4,
              color: 'white',
              opacity: 0.85,
            }}
          >
            FollowMee
          </Typography>
          <Typography sx={{ color: 'white', opacity: 0.6, mt: 1 }}>
            Your digital identity
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ProfileImageContent;
