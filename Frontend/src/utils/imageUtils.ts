/**
 * Utility functions for image handling and validation
 */

/**
 * Check if an image URL is from Cloudinary
 */
export const isCloudinaryUrl = (url: string | null | undefined): boolean => {
  return !!(url && url.includes('cloudinary.com'));
};

export const getOptimizedImageUrl = (url: string | null | undefined, width: number): string | undefined => {
  if (!url) return undefined;
  const targetWidth = Math.max(64, Math.round(width));
  if (isCloudinaryUrl(url) && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${targetWidth},c_fill/`);
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('imgix.net')) {
      parsed.searchParams.set('w', String(targetWidth));
      parsed.searchParams.set('auto', 'format,compress');
      parsed.searchParams.set('fit', 'crop');
      return parsed.toString();
    }
  } catch {
    // Keep non-URL image sources unchanged.
  }
  return url;
};

export const getResponsiveImageProps = (url: string | null | undefined, sizes: string) => {
  if (!url) return { sizes };
  if (!isCloudinaryUrl(url) && !url.includes('imgix.net')) {
    return { src: url, sizes };
  }
  return {
    src: getOptimizedImageUrl(url, 640),
    srcSet: [320, 640, 960].map(width => `${getOptimizedImageUrl(url, width)} ${width}w`).join(', '),
    sizes,
  };
};

/**
 * Validate if a Cloudinary image URL is properly formatted
 */
export const isValidCloudinaryUrl = (url: string | null | undefined): boolean => {
  if (!url || !isCloudinaryUrl(url)) return false;
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Basic Cloudinary URL structure check
    return pathname.includes('/upload/') && 
           pathname.split('/').length >= 4; // cloud_name/version/folder/public_id
  } catch {
    return false;
  }
};

/**
 * Extract public ID from Cloudinary URL
 */
export const extractCloudinaryPublicId = (url: string | null | undefined): string | null => {
  if (!isValidCloudinaryUrl(url)) return null;
  
  try {
    const urlParts = url!.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    const folderAndFile = urlParts.slice(uploadIndex + 2).join('/');
    return folderAndFile.replace(/\.[^/.]+$/, ''); // Remove file extension
  } catch {
    return null;
  }
};

/**
 * Check if an image URL should be considered invalid based on common patterns
 */
export const isLikelyInvalidImage = (url: string | null | undefined): boolean => {
  if (!url) return true;
  
  // Check for common invalid patterns
  const invalidPatterns = [
    'undefined',
    'null',
    '404',
    'not-found',
    'error',
    'missing',
    'example.com',
    'placeholder',
    'default',
    'no-image',
    'avatar-placeholder'
  ];
  
  const hasInvalidPattern = invalidPatterns.some(pattern => 
    url.toLowerCase().includes(pattern)
  );
  
  // Check if URL has reasonable structure
  try {
    new URL(url); // Just validate URL structure
    // Reject URLs without proper image extensions or known image hosts
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
    const isKnownImageHost = url.includes('cloudinary.com') || 
                           url.includes('ui-avatars.com') ||
                           url.includes('gravatar.com') ||
                           url.includes('lh3.googleusercontent.com');
    
    return hasInvalidPattern || (!hasImageExtension && !isKnownImageHost);
  } catch {
    return true; // Invalid URL structure
  }
};

/**
 * Generate a fallback avatar URL using a service like UI Avatars
 */
export const generateFallbackAvatar = (name: string, size: number = 200): string => {
  const firstName = name.split(' ')[0] || 'User';
  const lastName = name.split(' ')[1] || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=random&color=fff`;
};
