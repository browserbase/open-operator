import { useCallback } from 'react';
import { useResponsive } from './useResponsive';

/**
 * Custom hook to apply mobile-specific styling easily
 */
export function useMobileStyles() {
  const { isMobile, isTablet } = useResponsive();
  
  // Generates responsive font size classes based on screen size
  const fontSize = useCallback((
    base: string, 
    mobile: string = ''
  ): string => {
    if (!mobile) {
      // If no mobile size is provided, return base
      return base;
    }
    return isMobile ? mobile : base;
  }, [isMobile]);
  
  // Generates responsive padding classes based on screen size
  const padding = useCallback((
    base: string, 
    mobile: string = ''
  ): string => {
    if (!mobile) {
      return base;
    }
    return isMobile ? mobile : base;
  }, [isMobile]);
  
  // Generates responsive margin classes based on screen size
  const margin = useCallback((
    base: string, 
    mobile: string = ''
  ): string => {
    if (!mobile) {
      return base;
    }
    return isMobile ? mobile : base;
  }, [isMobile]);
  
  // Generates responsive grid classes based on screen size
  const grid = useCallback((
    base: string, 
    mobile: string = ''
  ): string => {
    if (!mobile) {
      return base;
    }
    return isMobile ? mobile : base;
  }, [isMobile]);
  
  // Returns a string of tailwind classes for responsive styling
  const responsive = useCallback((
    mobile: string,
    tablet: string = '',
    desktop: string = ''
  ): string => {
    if (isMobile) return mobile;
    if (isTablet && tablet) return tablet;
    return desktop || tablet || mobile; // Fallback to more generic styles
  }, [isMobile, isTablet]);
  
  return {
    fontSize,
    padding,
    margin,
    grid,
    responsive,
    isMobile,
    isTablet
  };
}
