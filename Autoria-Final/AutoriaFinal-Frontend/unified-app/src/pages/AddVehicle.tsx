import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/api';
import { 
  Upload, 
  X, 
  Camera, 
  Video, 
  CheckCircle, 
  AlertCircle,
  Loader2,  
  Car,
  Calendar,
  Gauge,
  Hash,
  Palette,
  Fuel,
  Wrench,
  DollarSign
} from 'lucide-react';

interface CarFormData {
  make: string;
  model: string;
  year: number;
  mileage: number;
  vin: string;
  color: string;
  fuelType: string;
  damageType: string;
  price: number;
  bodyStyle: string;
  locationId: string;
  images: File[];
  video?: File;
}

interface DropdownOption {
  value: string;
  label: string;
}

interface LocationOption {
  id: string;
  name: string;
}

const AddVehicle: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<CarFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    vin: '',
    color: '',
    fuelType: '',
    damageType: '',
    price: 0,
    bodyStyle: '',
    locationId: '',
    images: []
  });

  const [dropdowns, setDropdowns] = useState({
    makes: [] as DropdownOption[],
    models: [] as DropdownOption[],
    colors: [] as DropdownOption[],
    locations: [] as DropdownOption[],
    bodyStyles: [] as DropdownOption[]
  });

  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationWarning, setLocationWarning] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Role-based access control
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const roles = user?.user?.roles;
    const isSeller = roles && roles.includes('Seller');
    
    if (!isSeller) {
      navigate('/dashboard');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // Load dynamic dropdown data
  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      console.log('Loading dropdown data from API...');
      
      // Use the existing getLocations method
      const rawLocations = await apiClient.getLocations();
      
      // Log raw response for debugging
      console.log('Raw locations response:', JSON.stringify(rawLocations, null, 2));
      
      // Process locations based on actual API response format
      let processedLocations: {id: string, name: string}[] = [];
      
      if (Array.isArray(rawLocations) && rawLocations.length > 0) {
        // Check if response contains objects with id and name
        const hasIdAndName = rawLocations.every(item => 
          typeof item === 'object' && 
          item !== null && 
          typeof item.id === 'string' && 
          (typeof item.name === 'string' || typeof item.city === 'string')
        );
        
        if (hasIdAndName) {
          console.log('✅ Locations endpoint returned proper object format');
          processedLocations = rawLocations.map(loc => ({
            id: loc.id,
            name: loc.name || loc.city || 'Unknown Location'
          }));
        } else if (rawLocations.every(item => typeof item === 'string')) {
          console.warn('⚠️  Locations endpoint returned names only (no IDs). Backend must provide {id,name}.');
          console.warn('⚠️  Current response:', rawLocations);
          console.warn('⚠️  Expected format: [{"id": "guid", "name": "LocationName"}, ...]');
          
          // Create mock GUIDs for development
          processedLocations = rawLocations.map((name, index) => ({
            id: `mock-location-${index}-${Date.now()}`,
            name: name
          }));
          
          console.log('⚠️  Using mock GUIDs for development - backend should provide real GUIDs');
        } else {
          console.error('❌ Locations endpoint returned unexpected format:', rawLocations);
          throw new Error('Locations endpoint format not supported');
        }
      } else {
        console.error('❌ Locations endpoint returned empty or invalid response:', rawLocations);
        throw new Error('No locations available');
      }
      
      // Store processed location data
      setLocationOptions(processedLocations);
      
      // Clear any previous warnings
      setLocationWarning('');
      console.log('✅ Locations loaded successfully:', processedLocations.length, 'locations');

      setDropdowns({
        makes: [], // No longer needed - manual input
        models: [], // No longer needed - manual input
        colors: [], // No longer needed - manual input
        locations: processedLocations.map(location => ({ 
          value: location.id, // Use GUID as value
          label: location.name // Use name as display text
        })),
        bodyStyles: [] // No longer needed - manual input
      });

      console.log('Dropdown data loaded:', { 
        locations: processedLocations.map(l => ({ id: l.id, name: l.name })),
        mapping: 'value=id, label=name',
        totalLocations: processedLocations.length
      });
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      
      // Provide fallback data
      const fallbackLocations = [
        { id: 'fallback-1', name: 'Baku' },
        { id: 'fallback-2', name: 'Ganja' },
        { id: 'fallback-3', name: 'Sumgayit' },
        { id: 'fallback-4', name: 'Mingachevir' },
        { id: 'fallback-5', name: 'Lankaran' }
      ];
      
      setLocationOptions(fallbackLocations);
      setDropdowns(prev => ({
        ...prev,
        locations: fallbackLocations.map(location => ({ 
          value: location.id,
          label: location.name
        }))
      }));
    }
  };

  // No longer needed since Make and Model are manual inputs

  const handleInputChange = (field: keyof CarFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (file: File, type: 'image' | 'video') => {
    if (type === 'image') {
      // Check if we already have 15 images
      if (formData.images.length >= 15) {
        setErrors(prev => ({ 
          ...prev, 
          submit: 'Maximum 15 images allowed' 
        }));
        return;
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, file] }));
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({ ...prev, video: file }));
      const reader = new FileReader();
      reader.onload = (e) => setVideoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(e.target.files || []);
    
    if (type === 'image') {
      // Check if adding these files would exceed 15 images
      if (formData.images.length + files.length > 15) {
        setErrors(prev => ({ 
          ...prev, 
          submit: `Maximum 15 images allowed. You can add ${15 - formData.images.length} more images.` 
        }));
        return;
      }

      // Validate each file
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setErrors(prev => ({ 
            ...prev, 
            submit: 'Please select valid image files' 
          }));
          return;
        }

        // Validate file size (10MB for images)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          setErrors(prev => ({ 
            ...prev, 
            submit: `File size too large. Maximum 10MB allowed for images` 
          }));
          return;
        }

        handleFileUpload(file, type);
      }
    } else {
      const file = files[0];
      if (file) {
        if (!file.type.startsWith('video/')) {
          setErrors(prev => ({ 
            ...prev, 
            submit: 'Please select a valid video file' 
          }));
          return;
        }

        // Validate file size (50MB for videos)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
          setErrors(prev => ({ 
            ...prev, 
            submit: `File size too large. Maximum 50MB allowed for videos` 
          }));
          return;
        }

        handleFileUpload(file, type);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      if (type === 'image' && file.type.startsWith('image/')) {
        handleFileUpload(file, 'image');
      } else if (type === 'video' && file.type.startsWith('video/')) {
        handleFileUpload(file, 'video');
      } else {
        // Show error for wrong file type
        setErrors(prev => ({ 
          ...prev, 
          submit: `Please select a valid ${type} file` 
        }));
      }
    }
  };

  const removeFile = (type: 'image' | 'video', index?: number) => {
    if (type === 'image' && index !== undefined) {
      setFormData(prev => ({ 
        ...prev, 
        images: prev.images.filter((_, i) => i !== index) 
      }));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'video') {
      setFormData(prev => ({ ...prev, video: undefined }));
      setVideoPreview(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.make) newErrors.make = 'Make is required';
    if (!formData.model) newErrors.model = 'Model is required';
    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'Please enter a valid year';
    }
    if (!formData.vin || formData.vin.length < 17) {
      newErrors.vin = 'VIN must be at least 17 characters';
    }
    if (!formData.color) newErrors.color = 'Color is required';
    if (!formData.fuelType) newErrors.fuelType = 'Fuel type is required';
    if (!formData.damageType) newErrors.damageType = 'Damage type is required';
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (!formData.bodyStyle) newErrors.bodyStyle = 'Body style is required';
    if (!formData.locationId) newErrors.locationId = 'Location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting vehicle data:', formData);
      
      // Simple LocationId validation
      console.log('Validating LocationId:', formData.locationId);
      
      if (!formData.locationId) {
        setErrors({ submit: 'Please select a location from the dropdown.' });
        setLoading(false);
        return;
      }
      
      // Verify LocationId exists in available options
      const selectedLocation = locationOptions.find(loc => loc.id === formData.locationId);
      if (!selectedLocation) {
        console.error('❌ Selected LocationId not found in available options:', {
          selectedId: formData.locationId,
          availableIds: locationOptions.map(l => l.id)
        });
        
        setErrors({ 
          submit: 'Selected location is not valid. Please refresh the page and select again.' 
        });
        setLoading(false);
        return;
      }
      
      console.log('✅ LocationId validation passed:', {
        id: formData.locationId,
        name: selectedLocation.name
      });
      
      // Validate all required fields according to API spec
      const requiredFields = {
        Make: formData.make,
        Model: formData.model,
        Vin: formData.vin,
        Year: formData.year,
        LocationId: formData.locationId
      };
      
      const missingFields = Object.entries(requiredFields)
        .filter(([, value]) => !value || (typeof value === 'string' && value.trim() === ''))
        .map(([key]) => key);
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
        setErrors({ 
          submit: `Missing required fields: ${missingFields.join(', ')}. Please fill all required fields.` 
        });
        setLoading(false);
        return;
      }
      
      console.log('✅ All required fields validated:', requiredFields);
      
      // Create FormData for multipart/form-data request
      const submitData = new FormData();
      submitData.append('Make', formData.make);
      submitData.append('Model', formData.model);
      submitData.append('Year', formData.year.toString());
      submitData.append('Vin', formData.vin);
      submitData.append('Color', formData.color);
      submitData.append('BodyStyle', formData.bodyStyle);
      submitData.append('LocationId', formData.locationId);
      
      // Add OwnerId (required by backend)
      if (user?.user?.id) {
        submitData.append('OwnerId', user.user.id);
        console.log('Added OwnerId:', user.user.id);
      } else {
        console.error('❌ No user ID available for OwnerId field');
        setErrors({ 
          submit: 'Authentication error: User ID not available. Please log in again.' 
        });
        setLoading(false);
        return;
      }
      
      // Add only the first image for initial creation (backend expects single Image)
      if (formData.images.length > 0) {
        submitData.append('Image', formData.images[0]);
        console.log('Added Image:', formData.images[0].name, formData.images[0].size, 'bytes');
      } else {
        console.warn('⚠️  No image provided - Image field is optional but recommended');
      }
      
      // Log FormData contents for debugging
      console.log('FormData contents:');
      for (const [key, value] of submitData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Submit to API
      // Backend logging snippet for debugging:
      // [HttpPost]
      // public async Task<IActionResult> CreateCar([FromForm] CarCreateDto carDto)
      // {
      //   if (!ModelState.IsValid)
      //   {
      //     var errors = ModelState
      //       .Where(x => x.Value.Errors.Count > 0)
      //       .ToDictionary(k => k.Key, v => v.Value.Errors.Select(e => e.ErrorMessage).ToArray());
      //     _logger.LogError("ModelState validation failed: {Errors}", JsonSerializer.Serialize(errors));
      //     return BadRequest(ModelState);
      //   }
      //   // ... rest of the method
      // }
      
      const response = await fetch('https://localhost:7249/api/Car', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('authToken')}`
        },
        body: submitData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Vehicle created successfully:', result);
        
        // Upload additional images if any
        if (formData.images.length > 1) {
          await uploadAdditionalImages(result.id || result.carId, formData.images.slice(1));
        }
        
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/my-vehicles');
        }, 2000);
      } else {
        // Log detailed error response
        const errorText = await response.text();
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: 'https://localhost:7249/api/Car',
          body: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        let errorMessage = 'Failed to create vehicle. Please try again.';
        let detailedError = '';
        
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Parsed error JSON:', errorJson);
          
          if (errorJson.message) {
            errorMessage = errorJson.message;
            detailedError = errorJson.message;
          } else if (errorJson.errors) {
            const errorMessages = Object.values(errorJson.errors).flat();
            errorMessage = errorMessages.join(', ');
            detailedError = `Validation errors: ${errorMessages.join(', ')}`;
          } else if (errorJson.title) {
            errorMessage = errorJson.title;
            detailedError = errorJson.title;
          }
        } catch (parseError) {
          console.log('Could not parse error response as JSON:', errorText);
          detailedError = `Raw response: ${errorText}`;
        }
        
        // Show detailed error in console for debugging
        console.error('❌ Detailed Error Information:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          detailedError,
          requestData: {
            make: formData.make,
            model: formData.model,
            year: formData.year,
            vin: formData.vin,
            color: formData.color,
            bodyStyle: formData.bodyStyle,
            locationId: formData.locationId,
            ownerId: user?.user?.id,
            imageCount: formData.images.length
          }
        });
        
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      console.error('Error submitting vehicle:', error);
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const uploadAdditionalImages = async (carId: string, images: File[]) => {
    try {
      console.log(`Uploading ${images.length} additional images for car ${carId}`);
      
      for (const image of images) {
        const formData = new FormData();
        formData.append('File', image);
        
        const response = await fetch(`https://localhost:7249/api/Car/${carId}/photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('authToken')}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to upload image for car ${carId}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
        } else {
          console.log(`Successfully uploaded image for car ${carId}`);
        }
      }
    } catch (error) {
      console.error('Error uploading additional images:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      mileage: 0,
      vin: '',
      color: '',
      fuelType: '',
      damageType: '',
      price: 0,
      bodyStyle: '',
      locationId: '',
      images: []
    });
    setErrors({});
    setImagePreviews([]);
    setVideoPreview(null);
  };

  // Generate year options
  const yearOptions = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

  // Fuel type options
  const fuelTypeOptions = [
    { value: 'Petrol', label: 'Petrol' },
    { value: 'Diesel', label: 'Diesel' },
    { value: 'Hybrid', label: 'Hybrid' },
    { value: 'Electric', label: 'Electric' },
    { value: 'LPG', label: 'LPG' },
    { value: 'CNG', label: 'CNG' },
    { value: 'Biofuel', label: 'Biofuel' }
  ];

  // Damage type options
  const damageTypeOptions = [
    { value: 'None', label: 'No Damage' },
    { value: 'Minor', label: 'Minor Damage' },
    { value: 'Moderate', label: 'Moderate Damage' },
    { value: 'Major', label: 'Major Damage' },
    { value: 'Severe', label: 'Severe Damage' },
    { value: 'Salvage', label: 'Salvage Title' },
    { value: 'Flood', label: 'Flood Damage' },
    { value: 'Fire', label: 'Fire Damage' },
    { value: 'Hail', label: 'Hail Damage' },
    { value: 'Accident', label: 'Accident Damage' }
  ];


  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #1e1f3b, #2b2f77)',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <CheckCircle className="h-5 w-5" />
          <span>✅ Vehicle advertisement created successfully!</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Add New Vehicle</h1>
          <p className="text-blue-200">Create a new vehicle advertisement</p>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Make */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Car className="h-4 w-4 inline mr-2" />
                  Make *
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => handleInputChange('make', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.make ? 'border-red-400' : 'border-white/30'
                  }`}
                  placeholder="Enter vehicle make (e.g., Toyota, BMW, Ford)"
                />
                {errors.make && <p className="text-red-400 text-sm mt-1">{errors.make}</p>}
              </div>

              {/* Model */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Car className="h-4 w-4 inline mr-2" />
                  Model *
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.model ? 'border-red-400' : 'border-white/30'
                  }`}
                  placeholder="Enter vehicle model (e.g., Camry, X5, F-150)"
                />
                {errors.model && <p className="text-red-400 text-sm mt-1">{errors.model}</p>}
              </div>

              {/* Year */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Year *
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.year ? 'border-red-400' : 'border-white/30'
                  }`}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year} className="bg-slate-800 text-white">
                      {year}
                    </option>
                  ))}
                </select>
                {errors.year && <p className="text-red-400 text-sm mt-1">{errors.year}</p>}
              </div>

              {/* Mileage */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Gauge className="h-4 w-4 inline mr-2" />
                  Mileage (km)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => handleInputChange('mileage', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 border-white/30"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-200">km</span>
                </div>
              </div>

              {/* VIN */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Hash className="h-4 w-4 inline mr-2" />
                  VIN Number *
                </label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                  maxLength={17}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.vin ? 'border-red-400' : 'border-white/30'
                  }`}
                  placeholder="Enter VIN number"
                />
                {errors.vin && <p className="text-red-400 text-sm mt-1">{errors.vin}</p>}
              </div>

              {/* Color */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Palette className="h-4 w-4 inline mr-2" />
                  Color *
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.color ? 'border-red-400' : 'border-white/30'
                  }`}
                  placeholder="Enter vehicle color (e.g., White, Black, Silver, Red)"
                />
                {errors.color && <p className="text-red-400 text-sm mt-1">{errors.color}</p>}
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Fuel className="h-4 w-4 inline mr-2" />
                  Fuel Type *
                </label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => handleInputChange('fuelType', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.fuelType ? 'border-red-400' : 'border-white/30'
                  }`}
                >
                  <option value="">Select Fuel Type</option>
                  {fuelTypeOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.fuelType && <p className="text-red-400 text-sm mt-1">{errors.fuelType}</p>}
              </div>

              {/* Damage Type */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Wrench className="h-4 w-4 inline mr-2" />
                  Damage Type *
                </label>
                <select
                  value={formData.damageType}
                  onChange={(e) => handleInputChange('damageType', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.damageType ? 'border-red-400' : 'border-white/30'
                  }`}
                >
                  <option value="">Select Damage Type</option>
                  {damageTypeOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.damageType && <p className="text-red-400 text-sm mt-1">{errors.damageType}</p>}
              </div>

              {/* Body Style */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Car className="h-4 w-4 inline mr-2" />
                  Body Style *
                </label>
                <input
                  type="text"
                  value={formData.bodyStyle}
                  onChange={(e) => handleInputChange('bodyStyle', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.bodyStyle ? 'border-red-400' : 'border-white/30'
                  }`}
                  placeholder="Enter body style (e.g., Sedan, SUV, Hatchback, Coupe)"
                />
                {errors.bodyStyle && <p className="text-red-400 text-sm mt-1">{errors.bodyStyle}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Car className="h-4 w-4 inline mr-2" />
                  Location *
                </label>
                <select
                  value={formData.locationId}
                  onChange={(e) => handleInputChange('locationId', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                    errors.locationId ? 'border-red-400' : 'border-white/30'
                  }`}
                >
                  <option value="">Select Location</option>
                  {dropdowns.locations.map(option => (
                    <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.locationId && <p className="text-red-400 text-sm mt-1">{errors.locationId}</p>}
                
                {/* Developer Warning for Location API Issues */}
                {locationWarning && (
                  <div className="mt-2 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <p className="text-yellow-200 text-sm font-medium">Developer Warning</p>
                    </div>
                    <p className="text-yellow-200 text-xs mt-1">{locationWarning}</p>
                    <p className="text-yellow-300 text-xs mt-1">
                      Backend team: Please ensure /api/Location returns {"{"}id: GUID, name: string{"}"} objects.
                    </p>
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <DollarSign className="h-4 w-4 inline mr-2" />
                  Price *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    className={`w-full px-4 py-3 bg-white/20 border-2 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:border-blue-400 focus:bg-white/30 transition-all duration-300 ${
                      errors.price ? 'border-red-400' : 'border-white/30'
                    }`}
                    placeholder="Enter price"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-200">$</span>
                </div>
                {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
              </div>
            </div>

            {/* Media Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Camera className="h-4 w-4 inline mr-2" />
                  Vehicle Images ({formData.images.length}/15)
                </label>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeFile('image', index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                    dragOver ? 'border-blue-400 bg-blue-400/20' : 'border-blue-300/50'
                  } ${formData.images.length >= 15 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'image')}
                >
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-blue-300" />
                    <p className="text-blue-200">Drag & drop images here</p>
                    <p className="text-blue-300 text-sm">or click to upload (max 15 images)</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileInputChange(e, 'image')}
                      className="hidden"
                      id="image-upload"
                      disabled={formData.images.length >= 15}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`inline-block px-4 py-2 rounded-lg transition-colors cursor-pointer text-sm ${
                        formData.images.length >= 15 
                          ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Choose Images
                    </label>
                  </div>
                </div>
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-white font-medium mb-2">
                  <Video className="h-4 w-4 inline mr-2" />
                  Vehicle Video (max 30 sec)
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                    dragOver ? 'border-blue-400 bg-blue-400/20' : 'border-blue-300/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'video')}
                >
                  {videoPreview ? (
                    <div className="relative">
                      <video src={videoPreview} className="w-full h-32 object-cover rounded-lg mb-2" controls />
                      <button
                        type="button"
                        onClick={() => removeFile('video')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Video className="h-8 w-8 mx-auto text-blue-300" />
                      <p className="text-blue-200">Drag & drop video here</p>
                      <p className="text-blue-300 text-sm">or click to upload</p>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileInputChange(e, 'video')}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer text-sm"
                      >
                        Choose Video
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-500/20 border border-red-400 rounded-xl p-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-400">{errors.submit}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Advertisement'
                )}
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border-2 border-white/30 text-white rounded-xl font-medium hover:bg-white/10 transition-all duration-300"
              >
                Reset Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVehicle;
