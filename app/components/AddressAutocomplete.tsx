"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  label,
  readOnly = false,
  className = ""
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');

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
              onChange(place.formatted_address);
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
  }, [readOnly]);

  const baseInputClassName = `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent ${readOnly ? 'read-only:bg-gray-50 read-only:dark:bg-gray-800 read-only:cursor-default' : ''}`;

  const combinedClassName = className ? `${baseInputClassName} ${className}` : baseInputClassName;

  if (error) {
    // Fallback to regular input if Google Maps fails to load
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </label>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
      {isLoaded && !readOnly && (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
          ✓ Address autocomplete enabled
        </p>
      )}
    </div>
  );
}
