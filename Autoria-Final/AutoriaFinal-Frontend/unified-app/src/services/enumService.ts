import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../admin/services/apiClient';

// Types for enum metadata
export interface EnumMapping {
  [key: string]: string; // numeric key -> label
}

export interface EnumMetadata {
  [enumName: string]: EnumMapping;
}

export interface EnumUiConfig {
  color: string;
  bgColor: string;
  textColor: string;
}

export interface EnumUiMapping {
  [enumName: string]: {
    [value: string]: EnumUiConfig;
  };
}

// Cache configuration
const CACHE_KEY = 'enum-metadata';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Default fallback mappings (in case backend is unavailable)
const FALLBACK_ENUMS: EnumMetadata = {
  AuctionStatus: {
    '0': 'Draft',
    '1': 'Scheduled', 
    '2': 'Running',
    '3': 'Ended',
    '4': 'Cancelled',
    '5': 'Settled'
  },
  BidStatus: {
    '0': 'Placed',
    '1': 'Retracted', 
    '2': 'Invalidated'
  },
  BidType: {
    '1': 'Regular',
    '2': 'PreBid',
    '3': 'ProxyBid',
    '4': 'AutoBid'
  },
  CarCondition: {
    '0': 'Unknown',
    '1': 'RunAndDrive',
    '2': 'EngineStartProgram',
    '3': 'NoStart',
    '4': 'PartsOnly'
  },
  DamageType: {
    '0': 'Unknown',
    '1': 'FrontEnd',
    '2': 'RearEnd', 
    '3': 'Side',
    '4': 'AllOver',
    '5': 'Hail',
    '6': 'Flood',
    '7': 'Fire',
    '8': 'Vandalism',
    '9': 'NormalWear'
  },
  DriveTrain: {
    '0': 'Unknown',
    '1': 'FWD',
    '2': 'RWD',
    '3': 'AWD',
    '4': '4WD'
  },
  FuelType: {
    '0': 'Unknown',
    '1': 'Gasoline',
    '2': 'Diesel',
    '3': 'Electric',
    '4': 'Hybrid',
    '5': 'Other'
  },
  TitleType: {
    '0': 'Unknown',
    '1': 'Clean',
    '2': 'Salvage',
    '3': 'Rebuilt',
    '4': 'Flood',
    '5': 'Fire',
    '6': 'Lemon',
    '7': 'Other'
  },
  Transmission: {
    '0': 'Unknown',
    '1': 'Manual',
    '2': 'Automatic',
    '3': 'CVT',
    '4': 'SemiAutomatic'
  }
};

// UI color mappings for different enum values
const ENUM_UI_MAPPING: EnumUiMapping = {
  AuctionStatus: {
    '0': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    '1': { color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    '2': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    '3': { color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    '4': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '5': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' }
  },
  BidStatus: {
    '0': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    '1': { color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
    '2': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' }
  },
  BidType: {
    '1': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    '2': { color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    '3': { color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
    '4': { color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' }
  },
  CarCondition: {
    '0': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    '1': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    '2': { color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    '3': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '4': { color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' }
  },
  DamageType: {
    '0': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    '1': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '2': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '3': { color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
    '4': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '5': { color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    '6': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    '7': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '8': { color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    '9': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' }
  },
  DriveTrain: {
    '0': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    '1': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    '2': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    '3': { color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    '4': { color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' }
  },
  FuelType: {
    '0': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    '1': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    '2': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    '3': { color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
    '4': { color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
    '5': { color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' }
  },
  TitleType: {
    '0': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    '1': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    '2': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '3': { color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    '4': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    '5': { color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    '6': { color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
    '7': { color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' }
  },
  Transmission: {
    '0': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    '1': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    '2': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    '3': { color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    '4': { color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' }
  }
};

// Cache management
const getCachedEnums = (): EnumMetadata | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to parse cached enum data:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedEnums = (data: EnumMetadata): void => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache enum data:', error);
  }
};

// Main enum service hook
export const useEnums = () => {
  const [enums, setEnums] = useState<EnumMetadata>(FALLBACK_ENUMS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const loadEnums = useCallback(async (forceRefresh = false) => {
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = getCachedEnums();
      if (cached) {
        console.log('Enums loaded from cache');
        setEnums(cached);
        setError(null);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Loading enums from API...');
      
      // Try multiple endpoints for enum metadata
      let enumData = null;
      
      try {
        // First try the admin enums endpoint
        enumData = await apiClient.getEnums();
        console.log('Enums loaded from /api/admin/enums:', enumData);
      } catch (adminError) {
        console.log('Admin enums endpoint failed, trying metadata endpoint...');
        
        try {
          // Try the metadata enums endpoint
          enumData = await apiClient.request<any>('/api/metadata/enums');
          console.log('Enums loaded from /api/metadata/enums:', enumData);
        } catch (metadataError) {
          console.log('Metadata enums endpoint failed, trying /api/enums...');
          
          try {
            // Try the general enums endpoint
            enumData = await apiClient.request<any>('/api/enums');
            console.log('Enums loaded from /api/enums:', enumData);
          } catch (generalError) {
            console.log('All enum endpoints failed, using fallback mappings');
            throw new Error('No enum endpoints available');
          }
        }
      }
      
      if (enumData) {
        console.log('Enums loaded successfully:', enumData);
        setEnums(enumData);
        setCachedEnums(enumData);
        setLastFetch(new Date());
        setError(null);
        return enumData;
      } else {
        throw new Error('No enum data received');
      }
    } catch (err: any) {
      console.error('Failed to load enums:', err);
      
      // Use cached data if available, otherwise fallback
      const cached = getCachedEnums();
      if (cached) {
        console.log('Using cached enums due to API error');
        setEnums(cached);
        setError('Using cached data - API unavailable');
      } else {
        console.log('Using fallback enums due to API error');
        setEnums(FALLBACK_ENUMS);
        setError('API unavailable - using fallback data');
      }
      
      return cached || FALLBACK_ENUMS;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load enums on mount
  useEffect(() => {
    loadEnums();
  }, [loadEnums]);

  return {
    enums,
    loading,
    error,
    lastFetch,
    refresh: () => loadEnums(true)
  };
};

// Utility functions for enum operations
export const getEnumLabel = (
  enumName: string, 
  value: number | string, 
  enums: EnumMetadata = FALLBACK_ENUMS
): string => {
  const stringValue = String(value);
  const enumMapping = enums[enumName];
  
  if (!enumMapping) {
    console.warn(`getEnumLabel: Enum "${enumName}" not found`);
    return `Unknown (${stringValue})`;
  }
  
  const label = enumMapping[stringValue];
  if (!label) {
    console.warn(`getEnumLabel: Missing mapping for ${enumName}:${stringValue}`);
    return `Unknown (${stringValue})`;
  }
  
  return label;
};

export const getEnumUiConfig = (
  enumName: string,
  value: number | string
): EnumUiConfig => {
  const stringValue = String(value);
  const uiMapping = ENUM_UI_MAPPING[enumName];
  
  if (!uiMapping) {
    return { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
  }
  
  const config = uiMapping[stringValue];
  if (!config) {
    return { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
  }
  
  return config;
};

export const getEnumBadgeClasses = (
  enumName: string,
  value: number | string
): string => {
  const config = getEnumUiConfig(enumName, value);
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`;
};

// Helper function to get all enum values for a specific enum
export const getEnumValues = (
  enumName: string,
  enums: EnumMetadata = FALLBACK_ENUMS
): Array<{ value: string; label: string }> => {
  const enumMapping = enums[enumName];
  if (!enumMapping) return [];
  
  return Object.entries(enumMapping).map(([value, label]) => ({
    value,
    label
  }));
};

// Helper function to check if an enum value exists
export const isValidEnumValue = (
  enumName: string,
  value: number | string,
  enums: EnumMetadata = FALLBACK_ENUMS
): boolean => {
  const stringValue = String(value);
  const enumMapping = enums[enumName];
  return enumMapping ? stringValue in enumMapping : false;
};

// Export the UI mapping for direct access if needed
export { ENUM_UI_MAPPING };
