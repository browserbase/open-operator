"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader } from '@googlemaps/js-api-loader';

// Declare the custom element for TypeScript
declare module "react" {
  interface IntrinsicElements {
    'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      options?: string;
      placeholder?: string;
      value?: string;
      required?: boolean;
    };
  }
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  className?: string;
  required?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  label,
  readOnly = false,
  className = "",
  required = false
}: AddressAutocompleteProps) {
  const autocompleteElementRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isClient, setIsClient] = useState(false);

  // Calculate dropdown position based on input position
  const updateDropdownPosition = useCallback(() => {
    if (autocompleteElementRef.current) {
      const rect = autocompleteElementRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // Dropdown dimensions (estimated)
      const dropdownHeight = Math.min(240, suggestions.length * 56); // max-h-60 = 240px, each item ~56px
      const dropdownWidth = rect.width;
      
      // Calculate initial position (below input)
      let top = rect.bottom + window.scrollY + 4; // 4px margin
      let left = rect.left + window.scrollX;
      
      // Check if dropdown would go off the right edge
      if (left + dropdownWidth > viewport.width) {
        left = viewport.width - dropdownWidth - 8; // 8px padding from edge
      }
      
      // Check if dropdown would go off the left edge
      if (left < 8) {
        left = 8; // 8px padding from edge
      }
      
      // Check if dropdown would go off the bottom edge
      if (rect.bottom + dropdownHeight + 4 > viewport.height) {
        // Position above the input instead
        top = rect.top + window.scrollY - dropdownHeight - 4;
        
        // If it still doesn't fit above, position at the top of the viewport
        if (top < window.scrollY + 8) {
          top = window.scrollY + 8;
        }
      }
      
      setDropdownPosition({
        top,
        left,
        width: dropdownWidth
      });
    }
  }, [suggestions.length]);

  // Ensure we're on the client side for portal rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle window resize and scroll to reposition dropdown
  useEffect(() => {
    const handleReposition = () => {
      if (showSuggestions) {
        updateDropdownPosition();
      }
    };

    if (showSuggestions) {
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition);
    }

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition);
    };
  }, [showSuggestions, updateDropdownPosition]);

  // Sync internal input value with external value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setError('Google Maps API key not configured');
          return;
        }
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        });
        await loader.load();
        
        // Initialize the autocomplete service
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        
        // Create a dummy div for PlacesService (required)
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
        
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load address autocomplete');
      }
    };
    initializeAutocomplete();
  }, []);

  // Handle input changes and search for suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    if (newValue.length > 2 && autocompleteServiceRef.current) {
      // Get autocomplete predictions
      autocompleteServiceRef.current.getPlacePredictions({
        input: newValue,
        types: ['address'],
        componentRestrictions: { country: 'us' }
      }, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          updateDropdownPosition();
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setShowSuggestions(false);
    
    // Focus the input after selection
    if (autocompleteElementRef.current) {
      autocompleteElementRef.current.focus();
    }
  };

  // Position dropdown when suggestions change or window resizes
  useEffect(() => {
    updateDropdownPosition();
    
    const handleResize = () => {
      updateDropdownPosition();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateDropdownPosition);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateDropdownPosition);
    };
  }, [suggestions, updateDropdownPosition]);

  const handleInputFocus = () => {
    // Show suggestions when input is focused if there's text
    if (inputValue.length > 2 && suggestions.length > 0) {
      updateDropdownPosition();
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Hide suggestions after a brief delay to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  // Dropdown portal component
  const DropdownPortal = () => {
    if (!isClient || !showSuggestions || suggestions.length === 0) return null;

    return createPortal(
      <div 
        className="fixed z-[9999] backdrop-blur-md border rounded-md shadow-lg max-h-60 overflow-auto"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          marginTop: '4px',
          backgroundColor: 'var(--bg-modal)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.place_id}
            type="button"
            className="w-full px-3 py-2 text-left transition-colors focus:outline-none"
            style={{
              color: 'var(--text-primary)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{suggestion.structured_formatting.secondary_text}</div>
          </button>
        ))}
      </div>,
      document.body
    );
  };

  const baseInputClassName = `input-underline ${readOnly ? 'read-only:opacity-50 read-only:cursor-default' : ''}`;

  const combinedClassName = className ? `${baseInputClassName} ${className}` : baseInputClassName;

  if (error) {
    // Fallback to regular input if Google Maps fails to load
    return (
      <div className="input-group">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          readOnly={readOnly}
          className={combinedClassName}
          placeholder=" "
        />
        <label className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
          Address autocomplete unavailable - using text input
        </p>
      </div>
    );
  }

  return (
    <div className="input-group">
      <div className="relative">
        <input
          ref={autocompleteElementRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          readOnly={readOnly}
          className={combinedClassName}
          placeholder=" "
        />
        <label className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {!isLoaded && !readOnly && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-border border-t-[#FF3B00] rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <DropdownPortal />
    </div>
  );
}
