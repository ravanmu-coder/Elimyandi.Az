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
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Star,
  ChevronDown
} from 'lucide-react';
import { Combobox } from '@headlessui/react';
import { 
  colorOptions, 
  fuelTypeOptions, 
  damageTypeOptions, 
  bodyStyleOptions, 
  currencyOptions, 
  mileageUnitOptions
} from '../data/carBrands';
import { carMakes, popularBrands, CarMake } from '../constants/carMakes';
import * as SiIcons from 'react-icons/si';

const BrandIcon = ({ iconName, ...props }: { iconName: string } & React.SVGProps<SVGSVGElement>) => {
  const IconComponent = (SiIcons as any)[`Si${iconName}`];

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  // Fallback icon
  return <Car {...props} />;
};

interface CarFormData {
  make: string;
  model: string;
  year: number;
  mileage: number;
  mileageUnit: string;
  vin: string;
  color: string;
  fuelType: string;
  damageType: string;
  price: number;
  currency: string;
  bodyStyle: string;
  locationId: string;
  images: File[];
  video?: File;
}

interface LocationOption {
  id: string;
  name: string;
}

const AddVehicle: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState<CarMake | null>(null);
  const [filteredModels, setFilteredModels] = useState<string[]>([]);
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  
  // Brand selection state
  const [brandQuery, setBrandQuery] = useState('');
  
  const [formData, setFormData] = useState<CarFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    mileageUnit: 'km',
    vin: '',
    color: '',
    fuelType: '',
    damageType: '',
    price: 0,
    currency: 'AZN',
    bodyStyle: '',
    locationId: '',
    images: []
  });

  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
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

  // Load locations data
  useEffect(() => {
    loadLocations();
  }, []);

  // Filter models based on search term
  useEffect(() => {
    if (selectedBrand) {
      const filtered = selectedBrand.models.filter(model =>
        model.toLowerCase().includes(modelSearchTerm.toLowerCase())
      );
      setFilteredModels(filtered);
    }
  }, [selectedBrand, modelSearchTerm]);

  const loadLocations = async () => {
    try {
      const rawLocations = await apiClient.getLocations();
      let processedLocations: {id: string, name: string}[] = [];
      
      if (Array.isArray(rawLocations) && rawLocations.length > 0) {
        const hasIdAndName = rawLocations.every(item => 
          typeof item === 'object' && 
          item !== null && 
          typeof item.id === 'string' && 
          (typeof item.name === 'string' || typeof item.city === 'string')
        );
        
        if (hasIdAndName) {
          processedLocations = rawLocations.map(loc => ({
            id: loc.id,
            name: loc.name || loc.city || 'Unknown Location'
          }));
        } else if (rawLocations.every(item => typeof item === 'string')) {
          processedLocations = rawLocations.map((name, index) => ({
            id: `mock-location-${index}-${Date.now()}`,
            name: name
          }));
        }
      }
      
      setLocationOptions(processedLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
      const fallbackLocations = [
        { id: 'fallback-1', name: 'Baku' },
        { id: 'fallback-2', name: 'Ganja' },
        { id: 'fallback-3', name: 'Sumgayit' },
        { id: 'fallback-4', name: 'Mingachevir' },
        { id: 'fallback-5', name: 'Lankaran' }
      ];
      setLocationOptions(fallbackLocations);
    }
  };

  // Wizard navigation functions
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 5) {
      setCurrentStep(step);
    }
  };

  // Step 1: Brand selection
  const handleBrandSelect = (brand: CarMake | null) => {
    if (!brand) return;
    setSelectedBrand(brand);
    setFormData(prev => ({ ...prev, make: brand.name, model: '' }));
    setBrandQuery(brand.name);
    setModelSearchTerm('');
    setFilteredModels(brand.models);
    nextStep();
  };

  // Step 2: Model and year selection
  const handleModelSelect = (model: string) => {
    setFormData(prev => ({ ...prev, model }));
    setModelSearchTerm(model);
  };

  const handleYearSelect = (year: number) => {
    setFormData(prev => ({ ...prev, year }));
  };

  // Step 3: Technical specifications
  const handleInputChange = (field: keyof CarFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  // Step 4: File upload functions
  const handleFileUpload = (file: File, type: 'image' | 'video') => {
    if (type === 'image') {
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
      if (formData.images.length + files.length > 15) {
        setErrors(prev => ({ 
          ...prev, 
          submit: `Maximum 15 images allowed. You can add ${15 - formData.images.length} more images.` 
        }));
        return;
      }

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setErrors(prev => ({ 
            ...prev, 
            submit: 'Please select valid image files' 
          }));
          return;
        }

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

  // Step validation functions
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!selectedBrand) {
          newErrors.brand = 'Please select a brand';
        }
        break;
      case 2:
        if (!formData.model) newErrors.model = 'Model is required';
        if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
          newErrors.year = 'Please enter a valid year';
        }
        break;
      case 3:
        if (!formData.vin || formData.vin.length < 17) {
          newErrors.vin = 'VIN must be at least 17 characters';
        }
        if (!formData.color) newErrors.color = 'Color is required';
        if (!formData.fuelType) newErrors.fuelType = 'Fuel type is required';
        if (!formData.damageType) newErrors.damageType = 'Damage type is required';
        if (!formData.bodyStyle) newErrors.bodyStyle = 'Body style is required';
        if (!formData.price || formData.price <= 0) {
          newErrors.price = 'Price must be greater than 0';
        }
        if (!formData.locationId) newErrors.locationId = 'Location is required';
        break;
      case 4:
        if (formData.images.length < 3) {
          newErrors.images = 'Minimum 3 images required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    if (formData.images.length < 3) {
      newErrors.images = 'Minimum 3 images required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 5: Final submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // CRITICAL: Prevent page refresh
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
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
      } else {
        setErrors({ 
          submit: 'Authentication error: User ID not available. Please log in again.' 
        });
        setLoading(false);
        return;
      }
      
      // Add only the first image for initial creation
      if (formData.images.length > 0) {
        submitData.append('Image', formData.images[0]);
      }
      
      // Submit to API
      const response = await fetch('https://localhost:7249/api/Car', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('authToken')}`
        },
        body: submitData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Upload additional images if any
        if (formData.images.length > 1) {
          await uploadAdditionalImages(result.id || result.carId, formData.images.slice(1));
        }
        
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/my-vehicles');
        }, 2000);
      } else {
        const errorText = await response.text();
        let errorMessage = 'Failed to create vehicle. Please try again.';
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.errors) {
            const errorMessages = Object.values(errorJson.errors).flat();
            errorMessage = errorMessages.join(', ');
          }
        } catch (parseError) {
          console.log('Could not parse error response as JSON:', errorText);
        }
        
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
        }
      }
    } catch (error) {
      console.error('Error uploading additional images:', error);
    }
  };

  // Generate year options
  const yearOptions = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);


  // Step Components
  const Step1BrandSelection = () => {
    // Filter brands based on search query
    const filteredBrands = brandQuery === ''
      ? carMakes
      : carMakes.filter((brand) =>
          brand.name.toLowerCase().includes(brandQuery.toLowerCase())
        );

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Markanı Seçin</h2>
          <p className="text-slate-300">Avtomobilinizin markasını seçin</p>
        </div>

        {/* Brand Selection Dropdown */}
        <div className="max-w-2xl mx-auto">
          <Combobox value={selectedBrand} onChange={handleBrandSelect}>
            <div className="relative">
              <div className="relative">
                <Combobox.Input
                  className="w-full px-4 py-4 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300 pr-12"
                  placeholder="Marka axtarın..."
                  value={brandQuery}
                  onChange={(e) => setBrandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault(); // Prevent form submission
                    }
                  }}
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </Combobox.Button>
              </div>

              <Combobox.Options className="absolute z-50 mt-2 w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl max-h-96 overflow-y-auto custom-scrollbar">
                {/* Popular Brands Section */}
                {brandQuery === '' && (
                  <div className="p-4 border-b border-slate-700/50">
                    <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Məşhur Markalar
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {popularBrands.map((brand) => (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => handleBrandSelect(brand)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 text-left w-full"
                        >
                          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                            <BrandIcon iconName={brand.iconName} className="w-5 h-5 text-blue-400" />
                          </div>
                          <span className="text-white font-medium text-sm">{brand.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Results */}
                <div className="p-2">
                  {filteredBrands.length === 0 && brandQuery !== '' ? (
                    <div className="p-4 text-center text-slate-400">
                      Heç bir marka tapılmadı
                    </div>
                  ) : (
                    filteredBrands.map((brand) => (
                      <Combobox.Option
                        key={brand.id}
                        value={brand}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-3 px-4 rounded-lg transition-colors duration-200 ${
                            active ? 'bg-slate-700/50' : ''
                          }`
                        }
                      >
                        {({ selected }) => (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                              <BrandIcon iconName={brand.iconName} className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className={`font-medium text-sm ${
                              selected ? 'text-blue-400' : 'text-white'
                            }`}>
                              {brand.name}
                            </span>
                            {selected && (
                              <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />
                            )}
                          </div>
                        )}
                      </Combobox.Option>
                    ))
                  )}
                </div>
              </Combobox.Options>
            </div>
          </Combobox>
        </div>

        {/* Selected Brand Display */}
        {selectedBrand && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <BrandIcon iconName={selectedBrand.iconName} className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{selectedBrand.name}</h3>
                  <p className="text-slate-400 text-sm">{selectedBrand.models.length} model mövcuddur</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedBrand(null);
                    setFormData(prev => ({ ...prev, make: '', model: '' }));
                    setBrandQuery('');
                    goToStep(1);
                  }}
                  className="ml-auto text-sm text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Dəyişdir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Step2ModelYear = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mb-4">
          <Calendar className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Model və İl</h2>
        <p className="text-slate-300">
          {selectedBrand && (
            <span className="text-blue-300 font-semibold">{selectedBrand.name}</span>
          )} üçün model və ili seçin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Model Selection */}
        <div className="space-y-4">
          <label className="block text-white font-medium text-lg">
            Model Seçin *
          </label>
          <div className="relative">
            <input
              type="text"
              value={modelSearchTerm}
              onChange={(e) => setModelSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300"
              placeholder="Model axtarın..."
            />
            {modelSearchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto">
                {filteredModels.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => handleModelSelect(model)}
                    className="w-full px-4 py-3 text-left text-white hover:bg-slate-700/50 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl"
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
          {errors.model && <p className="text-red-400 text-sm">{errors.model}</p>}
        </div>

        {/* Year Selection */}
        <div className="space-y-4">
          <label className="block text-white font-medium text-lg">
            Buraxılış İli *
          </label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[2024, 2023, 2022].map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => handleYearSelect(year)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  formData.year === year
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <select
            value={formData.year}
            onChange={(e) => handleYearSelect(parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300"
          >
            {yearOptions.map(year => (
              <option key={year} value={year} className="bg-slate-800 text-white">
                {year}
              </option>
            ))}
          </select>
          {errors.year && <p className="text-red-400 text-sm">{errors.year}</p>}
        </div>
      </div>
    </div>
  );

  const Step3TechnicalSpecs = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4">
          <Wrench className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Texniki Göstəricilər</h2>
        <p className="text-slate-300">Avtomobilinizin texniki məlumatlarını daxil edin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VIN */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <Hash className="h-4 w-4 inline mr-2" />
            VIN Nömrəsi *
          </label>
          <input
            type="text"
            value={formData.vin}
            onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
            maxLength={17}
            className={`w-full px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300 ${
              errors.vin ? 'border-red-400' : ''
            }`}
            placeholder="VIN nömrəsini daxil edin"
          />
          {errors.vin && <p className="text-red-400 text-sm">{errors.vin}</p>}
        </div>

        {/* Body Style */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <Car className="h-4 w-4 inline mr-2" />
            Gövdə Tipi *
          </label>
          <select
            value={formData.bodyStyle}
            onChange={(e) => handleInputChange('bodyStyle', e.target.value)}
            className={`w-full px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300 ${
              errors.bodyStyle ? 'border-red-400' : ''
            }`}
          >
            <option value="">Gövdə tipini seçin</option>
            {bodyStyleOptions.map(style => (
              <option key={style} value={style} className="bg-slate-800 text-white">
                {style}
              </option>
            ))}
          </select>
          {errors.bodyStyle && <p className="text-red-400 text-sm">{errors.bodyStyle}</p>}
        </div>

        {/* Color Selection */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <Palette className="h-4 w-4 inline mr-2" />
            Rəng *
          </label>
          <div className="grid grid-cols-4 gap-3">
            {colorOptions.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => handleColorSelect(color.name)}
                className={`relative p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  formData.color === color.name
                    ? 'border-blue-400 shadow-lg shadow-blue-500/25'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                <span 
                  className="text-xs font-medium"
                  style={{ color: color.textColor }}
                >
                  {color.name}
                </span>
                {formData.color === color.name && (
                  <CheckCircle className="absolute -top-1 -right-1 w-5 h-5 text-blue-400 bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
          {errors.color && <p className="text-red-400 text-sm">{errors.color}</p>}
        </div>

        {/* Fuel Type */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <Fuel className="h-4 w-4 inline mr-2" />
            Yanacaq Növü *
          </label>
          <select
            value={formData.fuelType}
            onChange={(e) => handleInputChange('fuelType', e.target.value)}
            className={`w-full px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300 ${
              errors.fuelType ? 'border-red-400' : ''
            }`}
          >
            <option value="">Yanacaq növünü seçin</option>
            {fuelTypeOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                {option.label}
              </option>
            ))}
          </select>
          {errors.fuelType && <p className="text-red-400 text-sm">{errors.fuelType}</p>}
        </div>

        {/* Damage Type */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <Wrench className="h-4 w-4 inline mr-2" />
            Zədə Növü *
          </label>
          <select
            value={formData.damageType}
            onChange={(e) => handleInputChange('damageType', e.target.value)}
            className={`w-full px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300 ${
              errors.damageType ? 'border-red-400' : ''
            }`}
          >
            <option value="">Zədə növünü seçin</option>
            {damageTypeOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                {option.label}
              </option>
            ))}
          </select>
          {errors.damageType && <p className="text-red-400 text-sm">{errors.damageType}</p>}
        </div>

        {/* Mileage */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <Gauge className="h-4 w-4 inline mr-2" />
            Yürüş
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.mileage}
              onChange={(e) => handleInputChange('mileage', parseInt(e.target.value) || 0)}
              className="flex-1 px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300"
              placeholder="Yürüş məsafəsi"
            />
            <select
              value={formData.mileageUnit}
              onChange={(e) => handleInputChange('mileageUnit', e.target.value)}
              className="px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300"
            >
              {mileageUnitOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <DollarSign className="h-4 w-4 inline mr-2" />
            Qiymət *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              className={`flex-1 px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300 ${
                errors.price ? 'border-red-400' : ''
              }`}
              placeholder="Qiymət"
            />
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300"
            >
              {currencyOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {errors.price && <p className="text-red-400 text-sm">{errors.price}</p>}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="block text-white font-medium">
            <Car className="h-4 w-4 inline mr-2" />
            Məkan *
          </label>
          <select
            value={formData.locationId}
            onChange={(e) => handleInputChange('locationId', e.target.value)}
            className={`w-full px-4 py-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-400 focus:bg-slate-800/60 transition-all duration-300 ${
              errors.locationId ? 'border-red-400' : ''
            }`}
          >
            <option value="">Məkanı seçin</option>
            {locationOptions.map(option => (
              <option key={option.id} value={option.id} className="bg-slate-800 text-white">
                {option.name}
              </option>
            ))}
          </select>
          {errors.locationId && <p className="text-red-400 text-sm">{errors.locationId}</p>}
        </div>
      </div>
    </div>
  );

  const Step4MediaUpload = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mb-4">
          <Camera className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Şəkil və Video</h2>
        <p className="text-slate-300">Avtomobilinizin şəkillərini və videosunu yükləyin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Upload */}
        <div className="space-y-4">
          <label className="block text-white font-medium text-lg">
            Şəkillər ({formData.images.length}/15)
          </label>
          
          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={preview} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full h-32 object-cover rounded-xl" 
                  />
                  <button
                    type="button"
                    onClick={() => removeFile('image', index)}
                    className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              dragOver ? 'border-blue-400 bg-blue-400/20' : 'border-slate-600/50'
            } ${formData.images.length >= 15 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'image')}
          >
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-slate-400" />
              <div>
                <p className="text-white font-medium">Şəkilləri buraya sürükləyin</p>
                <p className="text-slate-400 text-sm">və ya klikləyərək yükləyin</p>
              </div>
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
                className={`inline-block px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  formData.images.length >= 15 
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/25'
                }`}
              >
                Şəkil Seç
              </label>
            </div>
          </div>
          {errors.images && <p className="text-red-400 text-sm">{errors.images}</p>}
        </div>

        {/* Video Upload */}
        <div className="space-y-4">
          <label className="block text-white font-medium text-lg">
            Video (isteğe bağlı)
          </label>
          
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              dragOver ? 'border-blue-400 bg-blue-400/20' : 'border-slate-600/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'video')}
          >
            {videoPreview ? (
              <div className="relative">
                <video 
                  src={videoPreview} 
                  className="w-full h-48 object-cover rounded-xl mb-4" 
                  controls 
                />
                <button
                  type="button"
                  onClick={() => removeFile('video')}
                  className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Video className="h-12 w-12 mx-auto text-slate-400" />
                <div>
                  <p className="text-white font-medium">Videonu buraya sürükləyin</p>
                  <p className="text-slate-400 text-sm">və ya klikləyərək yükləyin</p>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileInputChange(e, 'video')}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="inline-block bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-600 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 cursor-pointer"
                >
                  Video Seç
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const Step5Review = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mb-4">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Yekunlaşdırma</h2>
        <p className="text-slate-300">Məlumatları yoxlayın və elanı dərc edin</p>
      </div>

      <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vehicle Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Avtomobil Məlumatları</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Marka:</span>
                <span className="text-white font-medium">{formData.make}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span className="text-white font-medium">{formData.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">İl:</span>
                <span className="text-white font-medium">{formData.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">VIN:</span>
                <span className="text-white font-medium">{formData.vin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rəng:</span>
                <span className="text-white font-medium">{formData.color}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Yanacaq:</span>
                <span className="text-white font-medium">{formData.fuelType}</span>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Texniki Detallar</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Gövdə Tipi:</span>
                <span className="text-white font-medium">{formData.bodyStyle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Zədə:</span>
                <span className="text-white font-medium">{formData.damageType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Yürüş:</span>
                <span className="text-white font-medium">{formData.mileage} {formData.mileageUnit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Qiymət:</span>
                <span className="text-white font-medium">{formData.price} {formData.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Məkan:</span>
                <span className="text-white font-medium">
                  {locationOptions.find(loc => loc.id === formData.locationId)?.name || 'Seçilməyib'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Şəkillər:</span>
                <span className="text-white font-medium">{formData.images.length} şəkil</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="mt-6 bg-red-500/20 border border-red-400 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400">{errors.submit}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25"
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Dərc edilir...
              </>
            ) : (
              <>
                <Sparkles className="h-6 w-6" />
                Elanı Dərc Et
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Main return statement
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-indigo-900/80 to-slate-900/90"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <CheckCircle className="h-5 w-5" />
          <span>✅ Avtomobil elanı uğurla yaradıldı!</span>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Yeni Avtomobil Əlavə Et</h1>
          <p className="text-slate-300">Addım-addım avtomobil elanı yaradın</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <button
                  type="button"
                  onClick={() => goToStep(step)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                    step === currentStep
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : step < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                </button>
                {step < 5 && (
                  <div className={`w-8 h-1 mx-2 rounded ${
                    step < currentStep ? 'bg-green-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <form onSubmit={handleSubmit}>
          <div className="relative bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-75"></div>
            
            <div className="relative z-10">
              {/* Step Content */}
              {currentStep === 1 && <Step1BrandSelection />}
              {currentStep === 2 && <Step2ModelYear />}
              {currentStep === 3 && <Step3TechnicalSpecs />}
              {currentStep === 4 && <Step4MediaUpload />}
              {currentStep === 5 && <Step5Review />}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-12">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-slate-600 text-slate-300 rounded-xl font-medium hover:bg-slate-700/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Geri
                </button>

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep(currentStep)) {
                        nextStep();
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                  >
                    İrəli
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVehicle;
