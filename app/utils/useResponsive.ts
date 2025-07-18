import { useState, useEffect } from 'react';

// Custom hook for responsive design
export function useResponsive() {
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024
      });
    }

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}

// Utility function to get appropriate styles based on screen size
export function getResponsiveStyles(
  defaultStyles: string,
  mobileStyles?: string,
  tabletStyles?: string
) {
  return `${defaultStyles} ${mobileStyles ? `sm:${mobileStyles}` : ''} ${tabletStyles ? `md:${tabletStyles}` : ''}`;
}

// Breakpoint values in pixels (matching Tailwind defaults)
export const breakpoints = {
  sm: 640,  // Small devices (mobile)
  md: 768,  // Medium devices (tablets)
  lg: 1024, // Large devices (desktops)
  xl: 1280, // Extra large devices
  '2xl': 1536 // 2X large devices
};
