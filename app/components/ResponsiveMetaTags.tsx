'use client';

import { useEffect } from 'react';

/**
 * Component for setting responsive meta tags
 * This component will dynamically update the viewport meta tag to ensure
 * the site works well on mobile devices
 */
export default function ResponsiveMetaTags() {
  useEffect(() => {
    // Check if meta viewport tag exists
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    // If it doesn't exist, create it
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Set the content attribute
    viewportMeta.setAttribute(
      'content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
    );
    
    // Add additional meta tags if needed
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      const themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      themeColorMeta.setAttribute('content', '#ffffff');
      document.head.appendChild(themeColorMeta);
    }
    
    return () => {
      // Clean-up is not typically needed for meta tags
    };
  }, []);
  
  // This component doesn't render anything itself
  return null;
}
