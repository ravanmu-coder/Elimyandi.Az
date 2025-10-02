import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { Car, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface CarPhotosProps {
  carId: string;
  className?: string;
  showMultiple?: boolean;
  maxImages?: number;
}

interface CarPhotoData {
  photoUrls: string[];
  error?: string;
}

const CarPhotos: React.FC<CarPhotosProps> = ({ 
  carId, 
  className = '', 
  showMultiple = false,
  maxImages = 3 
}) => {
  const [photoData, setPhotoData] = useState<CarPhotoData>({ photoUrls: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({});

  const API_BASE_URL = 'https://localhost:7249';

  useEffect(() => {
    if (carId) {
      loadCarPhotos();
    }
  }, [carId]);

  const loadCarPhotos = async () => {
    try {
      setLoading(true);
      setError('');
      console.log(`Loading photos for car ID: ${carId}`);

      // Fetch car details from GET /api/car/{id}
      const carDetails = await apiClient.getCar(carId);
      console.log('Car details response:', carDetails);

      // Extract PhotoUrls - handle both array and semicolon-separated string
      let photoUrls: string[] = [];
      
      if (carDetails.photoUrls) {
        if (Array.isArray(carDetails.photoUrls)) {
          photoUrls = carDetails.photoUrls;
        } else if (typeof carDetails.photoUrls === 'string') {
          // Split by semicolon and filter out empty strings
          photoUrls = carDetails.photoUrls.split(';').filter((url: string) => url.trim() !== '');
        }
      }

      // Also check for other possible image fields
      const possibleImageFields = [
        carDetails.imageUrls,
        carDetails.imagePath,
        carDetails.image,
        carDetails.imageUrl
      ];

      for (const field of possibleImageFields) {
        if (field && photoUrls.length === 0) {
          if (Array.isArray(field)) {
            photoUrls = field;
          } else if (typeof field === 'string') {
            photoUrls = field.split(';').filter(url => url.trim() !== '');
          }
          break;
        }
      }

      console.log('Extracted photo URLs:', photoUrls);

      // Convert relative paths to full URLs
      const fullPhotoUrls = photoUrls.map(url => {
        // If URL is already absolute, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        // If URL starts with '/', it's already a relative path
        if (url.startsWith('/')) {
          return `${API_BASE_URL}${url}`;
        }
        // If URL doesn't start with '/', add it
        return `${API_BASE_URL}/${url}`;
      });

      console.log('Full photo URLs:', fullPhotoUrls);

      setPhotoData({ photoUrls: fullPhotoUrls });
    } catch (error) {
      console.error('Error loading car photos:', error);
      setError('Failed to load car photos');
      setPhotoData({ photoUrls: [], error: 'Failed to load car photos' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = (index: number) => {
    setImageLoadingStates(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    setImageLoadingStates(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoadStart = (index: number) => {
    setImageLoadingStates(prev => ({ ...prev, [index]: true }));
  };

  // Single image display (for table cells and cards)
  if (!showMultiple) {
    const firstImage = photoData.photoUrls[0];
    
    // Determine if we should use dynamic sizing or fixed sizing
    const useDynamicSizing = className.includes('w-full') || className.includes('h-full');
    const containerClasses = useDynamicSizing 
      ? `relative ${className}` 
      : `flex-shrink-0 h-12 w-16 relative ${className}`;
    
    const imageClasses = useDynamicSizing
      ? `w-full h-full object-cover transition-opacity duration-200 ${
          imageLoadingStates[0] ? 'opacity-0' : 'opacity-100'
        }`
      : `h-12 w-16 object-cover rounded-md border border-white/20 shadow-sm transition-opacity duration-200 ${
          imageLoadingStates[0] ? 'opacity-0' : 'opacity-100'
        }`;
    
    const loadingClasses = useDynamicSizing
      ? 'absolute inset-0 bg-gray-200 flex items-center justify-center'
      : 'absolute inset-0 h-12 w-16 bg-gray-600 rounded-md flex items-center justify-center border border-white/20 shadow-sm';
    
    const fallbackClasses = useDynamicSizing
      ? 'w-full h-full bg-gray-200 flex items-center justify-center'
      : 'h-12 w-16 bg-gray-600 rounded-md flex items-center justify-center border border-white/20 shadow-sm';
    
    const iconSize = useDynamicSizing ? 'h-8 w-8' : 'h-5 w-5';
    const spinnerSize = useDynamicSizing ? 'h-6 w-6' : 'h-4 w-4';
    
    if (loading) {
      return (
        <div className={containerClasses}>
          <div className={loadingClasses}>
            <Loader2 className={`${spinnerSize} text-gray-400 animate-spin`} />
          </div>
        </div>
      );
    }

    if (error || !firstImage) {
      return (
        <div className={containerClasses}>
          <div className={fallbackClasses}>
            <Car className={`${iconSize} text-gray-400`} />
          </div>
        </div>
      );
    }

    return (
      <div className={containerClasses}>
        {/* Loading state */}
        {imageLoadingStates[0] && (
          <div className={loadingClasses}>
            <Loader2 className={`${spinnerSize} text-gray-400 animate-spin`} />
          </div>
        )}
        
        {/* Image */}
        <img
          className={imageClasses}
          src={firstImage}
          alt={`Car ${carId}`}
          onLoadStart={() => handleImageLoadStart(0)}
          onLoad={() => handleImageLoad(0)}
          onError={() => handleImageError(0)}
        />
        
        {/* Fallback */}
        <div 
          className={fallbackClasses}
          style={{ display: imageLoadingStates[0] ? 'flex' : 'none' }}
        >
          <Car className={`${iconSize} text-gray-400`} />
        </div>
      </div>
    );
  }

  // Multiple images display (for detailed views)
  const displayImages = photoData.photoUrls.slice(0, maxImages);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (error || photoData.photoUrls.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No photos available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main image */}
      <div className="relative">
        {imageLoadingStates[0] && (
          <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        )}
        
        <img
          className={`w-full h-64 object-cover rounded-lg border border-gray-200 shadow-sm transition-opacity duration-200 ${
            imageLoadingStates[0] ? 'opacity-0' : 'opacity-100'
          }`}
          src={photoData.photoUrls[0]}
          alt={`Car ${carId} - Main`}
          onLoadStart={() => handleImageLoadStart(0)}
          onLoad={() => handleImageLoad(0)}
          onError={() => handleImageError(0)}
        />
        
        {/* Fallback for main image */}
        <div 
          className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-200"
          style={{ display: imageLoadingStates[0] ? 'flex' : 'none' }}
        >
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
      </div>

      {/* Thumbnail grid */}
      {displayImages.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {displayImages.slice(1).map((url, index) => (
            <div key={index} className="relative">
              {imageLoadingStates[index + 1] && (
                <div className="absolute inset-0 bg-gray-200 rounded-md flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                </div>
              )}
              
              <img
                className={`w-full h-20 object-cover rounded-md border border-gray-200 shadow-sm transition-opacity duration-200 ${
                  imageLoadingStates[index + 1] ? 'opacity-0' : 'opacity-100'
                }`}
                src={url}
                alt={`Car ${carId} - ${index + 2}`}
                onLoadStart={() => handleImageLoadStart(index + 1)}
                onLoad={() => handleImageLoad(index + 1)}
                onError={() => handleImageError(index + 1)}
              />
              
              {/* Fallback for thumbnails */}
              <div 
                className="w-full h-20 bg-gray-200 rounded-md flex items-center justify-center border border-gray-200"
                style={{ display: imageLoadingStates[index + 1] ? 'flex' : 'none' }}
              >
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show count if there are more images */}
      {photoData.photoUrls.length > maxImages && (
        <p className="text-sm text-gray-500 text-center">
          +{photoData.photoUrls.length - maxImages} more photos
        </p>
      )}
    </div>
  );
};

export default CarPhotos;
