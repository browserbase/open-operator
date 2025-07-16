"use client";

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Loader } from '@googlemaps/js-api-loader';

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
  placeholder,
  label,
  readOnly = false,
  className = "",
  required = false
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [inputValue, setInputValue] = useState(value);
  const isPlaceSelection = useRef(false);
  const pendingSelection = useRef<string | null>(null);

  // Sync internal input value with external value prop
  useEffect(() => {
    if (!isPlaceSelection.current && !pendingSelection.current) {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        // You'll need to add your Google Maps API key to environment variables
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
        
        if (inputRef.current && !readOnly) {
          autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'us' }, // Restrict to US addresses, adjust as needed
            fields: ['formatted_address', 'address_components', 'geometry']
          });

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (place?.formatted_address) {
              const selectedAddress = place.formatted_address;
              
              // Set flags to prevent interference
              isPlaceSelection.current = true;
              pendingSelection.current = selectedAddress;
              
              // Use flushSync to ensure immediate state update
              flushSync(() => {
                setInputValue(selectedAddress);
                onChange(selectedAddress);
              });
              
              // Clean up after a short delay
              setTimeout(() => {
                pendingSelection.current = null;
                isPlaceSelection.current = false;
                
                if (inputRef.current) {
                  inputRef.current.blur();
                }
              }, 50);
            }
          });
        }
        
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load address autocomplete');
      }
    };

    initializeAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [readOnly, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Don't update if we have a pending selection or are in place selection mode
    if (!isPlaceSelection.current && !pendingSelection.current) {
      setInputValue(newValue);
      onChange(newValue);
    }
  };

  const handleInputFocus = () => {
    // Reset flags when user focuses on input to allow normal typing
    if (!pendingSelection.current) {
      isPlaceSelection.current = false;
    }
  };

  const baseInputClassName = `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent ${readOnly ? 'read-only:bg-gray-50 read-only:dark:bg-gray-800 read-only:cursor-default' : ''}`;

  const combinedClassName = className ? `${baseInputClassName} ${className}` : baseInputClassName;

  if (error) {
    // Fallback to regular input if Google Maps fails to load
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          readOnly={readOnly}
          className={combinedClassName}
          placeholder={placeholder}
        />
        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
          Address autocomplete unavailable - using text input
        </p>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          readOnly={readOnly}
          className={combinedClassName}
          placeholder={placeholder || `Enter ${label?.toLowerCase() || 'address'}`}
        />
        {!isLoaded && !readOnly && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-[#FF3B00] rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}
