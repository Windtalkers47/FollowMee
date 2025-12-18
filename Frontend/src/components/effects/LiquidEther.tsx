import { useEffect, useRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { gsap } from 'gsap';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: { r: number; g: number; b: number; a: number };
  vx: number;
  vy: number;
}

interface LiquidEtherProps extends BoxProps {
  color?: string;
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  resolution?: number;
  isBounce?: boolean;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
  sx?: BoxProps['sx'];
}

const LiquidEther = ({ ...props }: LiquidEtherProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize particles
  const initParticles = (width: number, height: number): Particle[] => {
    // Parse the color from props or use default
  const color = props.color || '#5227FF';
  const colorRgb = hexToRgb(color) || { r: 82, g: 39, b: 255 };
  const colors = [
    { ...colorRgb, a: 0.6 },
    { 
      r: Math.min(255, colorRgb.r + 50), 
      g: Math.min(255, colorRgb.g + 50), 
      b: Math.min(255, colorRgb.b + 50), 
      a: 0.6 
    },
    { 
      r: Math.max(0, colorRgb.r - 50), 
      g: Math.max(0, colorRgb.g - 50), 
      b: Math.max(0, colorRgb.b - 50), 
      a: 0.6 
    },
  ];

    const particleCount = 10;
    const { 
      autoSpeed = 0.5,
      autoIntensity = 1.0,
      mouseForce = 15,
      cursorSize = 100,
      isViscous = false,
      viscous = 30,
      isBounce = false,
      autoDemo = true
    } = props;

    return Array(particleCount).fill(null).map((_, i) => {
      const baseSpeed = (autoDemo ? autoSpeed : 0.5) * (0.5 + Math.random() * 0.5) * autoIntensity;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 50 + Math.random() * 100,
        color: colors[i % colors.length],
        vx: (Math.random() - 0.5) * baseSpeed,
        vy: (Math.random() - 0.5) * baseSpeed,
        baseVx: 0,
        baseVy: 0,
        mouseForce: 0,
        cursorSize: 0,
        isViscous,
        viscous,
        isBounce
      };
    });
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Animation loop
  const animate = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!canvasRef.current) return;
    
    ctx.clearRect(0, 0, width, height);
    
    // Get mouse position
    let mouseX = 0;
    let mouseY = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      }
    };
    
    canvasRef.current.addEventListener('mousemove', handleMouseMove);
    
    particlesRef.current.forEach(particle => {
      // Mouse interaction
      const dx = mouseX - particle.x;
      const dy = mouseY - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = props.cursorSize || 100;
      
      if (distance < maxDistance) {
        const force = (1 - distance / maxDistance) * (props.mouseForce || 15);
        const angle = Math.atan2(dy, dx);
        particle.vx += Math.cos(angle) * force * 0.1;
        particle.vy += Math.sin(angle) * force * 0.1;
      }
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Bounce off edges
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      
      // Draw particle with GSAP for smooth animations
      gsap.to(particle, {
        duration: 2,
        x: particle.x,
        y: particle.y,
        ease: 'sine.inOut',
      });
      
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size
      );
      
      gradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.color.a})`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
    
    ctx.globalCompositeOperation = 'lighter';
    if (ctx) {
      animationRef.current = requestAnimationFrame(() => animate(ctx, width, height));
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const handleResize = () => {
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Update canvas size
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Reinitialize particles on resize
      particlesRef.current = initParticles(width, height);
    };
    
    // Initial setup
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Start animation
    if (canvas.width && canvas.height) {
      particlesRef.current = initParticles(canvas.width, canvas.height);
      animate(ctx, canvas.width, canvas.height);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      {...props}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0,
        ...props.sx,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  );
};

export default LiquidEther;
