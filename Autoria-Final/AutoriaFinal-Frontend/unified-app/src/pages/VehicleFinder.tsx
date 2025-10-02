import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Grid, List, MapPin, Gauge, Car, Eye, Heart, Plus, X, RefreshCw } from 'lucide-react';
import { apiClient } from '../lib/api';
import { VehicleSearchParams, VehicleSearchResult, VehicleFilters, CarData } from '../types/api';
import CarPhotos from '../components/CarPhotos';
import Alert from '../components/Alert';
import { useAuth } from '../hooks/useAuth';

const VehicleFinder: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [urlSearchParams] = useSearchParams();
  const [searchParams, setSearchParams] = useState<VehicleSearchParams>({
    page: 1,
    pageSize: 12
  });
  const [searchResults, setSearchResults] = useState<VehicleSearchResult | null>(null);
  const [filters, setFilters] = useState<VehicleFilters | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'removed' } | null>(null);

  // Role-based access control
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const roles = user?.user?.roles;
    const isMember = roles && roles.includes('Member');
    const isSeller = roles && roles.includes('Seller');
    
    if (!isMember && !isSeller) {
      navigate('/dashboard');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  // Load filters and watchlist on component mount
  useEffect(() => {
    if (isAuthenticated && (user?.user?.roles?.includes('Member') || user?.user?.roles?.includes('Seller'))) {
    loadFilters();
    loadWatchlist();
    }
  }, [isAuthenticated, user]);

  // Handle URL search parameters
  useEffect(() => {
    const searchQuery = urlSearchParams.get('search');
    if (searchQuery) {
      // Set search parameters based on URL query
      setSearchParams(prev => ({
        ...prev,
        make: searchQuery,
        page: 1
      }));
    }
  }, [urlSearchParams]);

  // Load models when make changes
  useEffect(() => {
    if (searchParams.make) {
      loadModels(searchParams.make);
    } else {
      setModels([]);
    }
  }, [searchParams.make]);

  const loadFilters = async () => {
    try {
      console.log('Loading vehicle filters from API endpoints...');
      // Load all filter data in parallel for better performance
      const [makes, conditions, damageTypes, types, locations] = await Promise.allSettled([
        apiClient.getVehicleMakes(),
        apiClient.getVehicleConditions(),
        apiClient.getVehicleDamageTypes(),
        apiClient.getVehicleTypes(),
        apiClient.getLocations()
      ]);

      // Extract results with fallbacks
      const makesResult = makes.status === 'fulfilled' ? makes.value : [];
      const conditionsResult = conditions.status === 'fulfilled' ? conditions.value : [];
      const damageTypesResult = damageTypes.status === 'fulfilled' ? damageTypes.value : [];
      const typesResult = types.status === 'fulfilled' ? types.value : [];
      const locationsResult = locations.status === 'fulfilled' ? locations.value : [];

      console.log('Filter results:', {
        makes: makesResult,
        conditions: conditionsResult,
        damageTypes: damageTypesResult,
        types: typesResult,
        locations: locationsResult
      });

      // Extract location names from location objects
      const locationNames = locationsResult.map((location: any) => 
        location.name || location.city || location.id || 'Unknown Location'
      );

      const filtersData = {
        conditions: ['All', ...conditionsResult],
        types: ['All', ...typesResult],
        damageTypes: ['All', ...damageTypesResult],
        makes: ['All', ...makesResult],
        models: ['All'], // Models will be loaded dynamically when make is selected
        locations: ['All', ...locationNames]
      };

      console.log('Filters loaded successfully:', filtersData);
      setFilters(filtersData);
    } catch (error) {
      console.error('Error loading filters:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Failed to load filters: ${errorMessage}. Using default options.`, 'error');
      // Set default filters
      setFilters({
        conditions: ['All', 'Used', 'Salvage', 'Excellent', 'Good', 'Fair'],
        types: ['All', 'Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Hatchback', 'Wagon'],
        damageTypes: ['All', 'None', 'Front End', 'Rear End', 'Side', 'All Over', 'Water/Flood', 'Hail', 'Vandalism'],
        makes: ['All', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Toyota', 'Honda', 'Nissan', 'Hyundai'],
        models: ['All'],
        locations: ['All', 'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Miami', 'Dallas', 'Atlanta', 'Denver', 'Seattle']
      });
    }
  };

  const loadModels = async (make: string) => {
    try {
      console.log(`Loading models for make: ${make}`);
      const modelsData = await apiClient.getVehicleModels(make);
      console.log('Models loaded successfully:', modelsData);
      setModels(modelsData);
    } catch (error) {
      console.error('Error loading models:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Failed to load models: ${errorMessage}`);
      setModels([]);
    }
  };

  const loadWatchlist = () => {
    try {
      console.log('Loading watchlist from localStorage...');
      const savedWatchlist = localStorage.getItem('vehicleWatchlist');
      if (savedWatchlist) {
        const watchlistArray: string[] = JSON.parse(savedWatchlist);
        const watchlistIds = new Set<string>(watchlistArray);
        console.log('Watchlist loaded from localStorage:', watchlistIds);
        setWatchlist(watchlistIds);
      } else {
        console.log('No watchlist found in localStorage, starting with empty watchlist');
        setWatchlist(new Set<string>());
      }
    } catch (error) {
      console.error('Error loading watchlist from localStorage:', error);
      setWatchlist(new Set<string>());
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      console.log('Loading all vehicles from GET /api/car...');
      
      // Get all vehicles from GET /api/car endpoint
      const allVehicles: CarData[] = await apiClient.getCars();
      console.log('All vehicles from API:', allVehicles);
      
      // Apply client-side filtering
      const filteredVehicles = applyClientSideFilters(allVehicles, searchParams);
      console.log('Filtered vehicles:', filteredVehicles);
      
      // Apply pagination
      const page = searchParams.page || 1;
      const pageSize = searchParams.pageSize || 12;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);
      
      const results = {
        vehicles: paginatedVehicles,
        totalCount: filteredVehicles.length,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(filteredVehicles.length / pageSize)
      };
      
      console.log('Final search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Failed to load vehicles: ${errorMessage}. Please check your connection and try again.`, 'error');
      setSearchResults({
        vehicles: [],
        totalCount: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering function
  const applyClientSideFilters = (vehicles: CarData[], params: VehicleSearchParams) => {
    if (!vehicles || vehicles.length === 0) return [];
    
    return vehicles.filter(vehicle => {
      // Make filter
      if (params.make && params.make !== 'All' && vehicle.make?.toLowerCase() !== params.make.toLowerCase()) {
        return false;
      }
      
      // Model filter
      if (params.model && params.model !== 'All' && vehicle.model?.toLowerCase() !== params.model.toLowerCase()) {
        return false;
      }
      
      // Year range filter
      if (params.minYear && vehicle.year < params.minYear) {
        return false;
      }
      if (params.maxYear && vehicle.year > params.maxYear) {
        return false;
      }
      
      // Price range filter
      if (params.minPrice && vehicle.estimatedRetailValue && vehicle.estimatedRetailValue < params.minPrice) {
        return false;
      }
      if (params.maxPrice && vehicle.estimatedRetailValue && vehicle.estimatedRetailValue > params.maxPrice) {
        return false;
      }
      
      // Mileage filter
      if (params.minOdometer && vehicle.odometer && vehicle.odometer < params.minOdometer) {
        return false;
      }
      if (params.maxOdometer && vehicle.odometer && vehicle.odometer > params.maxOdometer) {
        return false;
      }
      
      // Condition filter
      if (params.condition && params.condition !== 'All' && vehicle.condition?.toLowerCase() !== params.condition.toLowerCase()) {
        return false;
      }
      
      // Damage type filter
      if (params.damageType && params.damageType !== 'All' && vehicle.primaryDamage?.toLowerCase() !== params.damageType.toLowerCase()) {
        return false;
      }
      
      // Type filter
      if (params.type && params.type !== 'All' && vehicle.type?.toLowerCase() !== params.type.toLowerCase()) {
        return false;
      }
      
      // Location filter
      if (params.location && params.location !== 'All') {
        // This would need location data to be loaded and matched
        // For now, we'll skip location filtering or implement it based on available data
      }
      
      // Text search filter - handled by make/model/vin/lotNumber filters
      
      return true;
    });
  };

  // Enhanced search with debouncing
  const debouncedSearch = React.useCallback(
    debounce(() => {
      if (filters) {
        handleSearch();
      }
    }, 500),
    [filters]
  );

  // Debounce function
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Auto-search when filters change with debouncing
  useEffect(() => {
    if (filters) {
      debouncedSearch();
    }
  }, [searchParams, filters, debouncedSearch]);

  // Load all vehicles on component mount
  useEffect(() => {
    if (isAuthenticated && (user?.user?.roles?.includes('Member') || user?.user?.roles?.includes('Seller'))) {
      handleSearch();
    }
  }, [isAuthenticated, user]);

  // Reload watchlist when component becomes visible (handles page refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadWatchlist();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleInputChange = (field: keyof VehicleSearchParams, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Enhanced search input handler with better logic
  const handleSearchInputChange = (value: string) => {
    if (value.match(/^[A-Z0-9]{17}$/)) {
      // VIN pattern (17 alphanumeric characters)
      handleInputChange('vin', value);
      handleInputChange('lotNumber', undefined);
      handleInputChange('make', undefined);
      handleInputChange('model', undefined);
    } else if (value.match(/^LOT-/i)) {
      // Lot number pattern
      handleInputChange('lotNumber', value);
      handleInputChange('vin', undefined);
      handleInputChange('make', undefined);
      handleInputChange('model', undefined);
    } else if (value.length > 0) {
      // General search - try to match make first, then model
      const words = value.split(' ');
      if (words.length === 1) {
        // Single word - likely a make
        handleInputChange('make', value);
        handleInputChange('model', undefined);
        handleInputChange('vin', undefined);
        handleInputChange('lotNumber', undefined);
      } else {
        // Multiple words - first word is make, rest is model
        handleInputChange('make', words[0]);
        handleInputChange('model', words.slice(1).join(' '));
        handleInputChange('vin', undefined);
        handleInputChange('lotNumber', undefined);
      }
    } else {
      // Clear all search fields
      handleInputChange('make', undefined);
      handleInputChange('model', undefined);
      handleInputChange('vin', undefined);
      handleInputChange('lotNumber', undefined);
    }
  };

  const clearFilters = () => {
    setSearchParams({
      page: 1,
      pageSize: 12
    });
  };

  const clearWatchlist = () => {
    try {
      setWatchlist(new Set<string>());
      localStorage.removeItem('watchlist');
      localStorage.removeItem('vehicleWatchlist');
      localStorage.removeItem('vehicleWatchlistData');
      showAlert('Watchlist cleared successfully', 'success');
      console.log('Watchlist cleared');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      showAlert('Error clearing watchlist. Please try again.', 'error');
    }
  };

  const showAlert = (message: string, type: 'success' | 'error' | 'info' | 'removed') => {
    setAlert({ message, type });
  };


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };


  const VehicleCard: React.FC<{ vehicle: CarData; viewMode: 'grid' | 'list' }> = ({ vehicle, viewMode }) => {
    if (viewMode === 'list') {
      return (
        <div className="bg-slate-800/40 backdrop-blur-lg border border-slate-600 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-[1.02] hover:border-slate-500">
          <div className="flex">
            <div className="relative w-48 h-32 flex-shrink-0">
              <CarPhotos 
                carId={vehicle.id} 
                showMultiple={false}
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                <span className="bg-blue-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-bold border border-blue-500/50">
                  Available
                </span>
              </div>
              {/* VIN */}
              <div className="absolute top-2 right-2">
                <span className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold border border-white/20">
                  {vehicle.vin ? vehicle.vin.substring(0, 8) + '...' : 'N/A'}
                </span>
              </div>
            </div>
            <div className="flex-1 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    {vehicle.odometer && (
                      <span className="flex items-center gap-1">
                        <Gauge className="h-4 w-4" />
                        {vehicle.odometer.toLocaleString()} {vehicle.odometerUnit || 'km'}
                      </span>
                    )}
                    {vehicle.primaryDamage && vehicle.primaryDamage !== 'None' && (
                      <span className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        {vehicle.primaryDamage}
                      </span>
                    )}
                    {vehicle.locationName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {vehicle.locationName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400 mb-1">
                    {vehicle.estimatedRetailValue ? formatPrice(vehicle.estimatedRetailValue) : 'Contact for Price'}
                  </p>
                  <p className="text-sm text-slate-300">
                    {vehicle.color || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {vehicle.condition && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
                      vehicle.condition === 'Used' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 
                      vehicle.condition === 'Salvage' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 
                      'bg-green-500/20 text-green-300 border-green-500/30'
                    }`}>
                      {vehicle.condition}
                    </span>
                  )}
                  {vehicle.type && (
                    <span className="px-2 py-1 bg-slate-600/50 text-slate-200 text-xs rounded-full font-medium backdrop-blur-sm border border-slate-500/30">
                      {vehicle.type}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newWatchlist = new Set(watchlist);
                      if (watchlist.has(vehicle.id)) {
                        // Remove from watchlist
                        newWatchlist.delete(vehicle.id);
                        setWatchlist(newWatchlist);
                        
                        // Remove from localStorage IDs
                        localStorage.setItem('watchlist', JSON.stringify(Array.from(newWatchlist)));
                        
                        // Remove from localStorage detailed data
                        const savedWatchlistData = localStorage.getItem('vehicleWatchlistData');
                        if (savedWatchlistData) {
                          const watchlistData: any[] = JSON.parse(savedWatchlistData);
                          const filteredData = watchlistData.filter(item => item.id !== vehicle.id);
                          localStorage.setItem('vehicleWatchlistData', JSON.stringify(filteredData));
                        }
                        
                        // Also remove from vehicleWatchlist (for compatibility)
                        const savedVehicleWatchlist = localStorage.getItem('vehicleWatchlist');
                        if (savedVehicleWatchlist) {
                          const vehicleWatchlistArray: string[] = JSON.parse(savedVehicleWatchlist);
                          const filteredIds = vehicleWatchlistArray.filter(id => id !== vehicle.id);
                          localStorage.setItem('vehicleWatchlist', JSON.stringify(filteredIds));
                        }
                        
                        showAlert('Removed from Watchlist', 'removed');
                      } else {
                        // Add to watchlist
                        newWatchlist.add(vehicle.id);
                        setWatchlist(newWatchlist);
                        
                        // Save IDs to localStorage
                        localStorage.setItem('watchlist', JSON.stringify(Array.from(newWatchlist)));
                        
                        // Save detailed vehicle data to localStorage
                        const savedWatchlistData = localStorage.getItem('vehicleWatchlistData');
                        const watchlistData: any[] = savedWatchlistData ? JSON.parse(savedWatchlistData) : [];
                        
                        const detailedVehicleData = {
                          id: vehicle.id,
                          auctionCarId: vehicle.id,
                          carId: vehicle.id,
                          auctionId: 'unknown',
                          lotNumber: `LOT-${vehicle.id.slice(-4)}`,
                          year: vehicle.year || 2020,
                          make: vehicle.make || 'Unknown',
                          model: vehicle.model || 'Unknown',
                          image: vehicle.photoUrls?.[0] || '/placeholder-car.jpg',
                          odometer: vehicle.odometer || 0,
                          damage: vehicle.primaryDamage || 'None',
                          estimatedRetailValue: vehicle.estimatedRetailValue || 0,
                          currentBid: vehicle.estimatedRetailValue || 0,
                          bidCount: 0,
                          reservePrice: vehicle.estimatedRetailValue || 0,
                          isReserveMet: false,
                          auctionStartTime: new Date().toISOString(),
                          auctionEndTime: new Date().toISOString(),
                          isLive: false,
                          location: {
                            city: vehicle.locationCity || 'Unknown',
                            region: 'North America',
                            address: vehicle.locationAddress || 'Unknown',
                            phone: '+1-555-0123',
                            email: 'auction@example.com',
                            username: 'AuctionHouse',
                            auctionJoinDate: new Date().toISOString()
                          },
                          condition: {
                            titleType: vehicle.condition === 'Salvage' ? 'Salvage' : 'Clean',
                            keysStatus: 'Available' as const
                          },
                          addedToWatchlistAt: new Date().toISOString()
                        };
                        
                        // Check if vehicle already exists in detailed data
                        const existingIndex = watchlistData.findIndex(item => item.id === vehicle.id);
                        if (existingIndex === -1) {
                          watchlistData.push(detailedVehicleData);
                          localStorage.setItem('vehicleWatchlistData', JSON.stringify(watchlistData));
                        }
                        
                        // Also save to vehicleWatchlist (for compatibility)
                        const savedVehicleWatchlist = localStorage.getItem('vehicleWatchlist');
                        const vehicleWatchlistArray: string[] = savedVehicleWatchlist ? JSON.parse(savedVehicleWatchlist) : [];
                        if (!vehicleWatchlistArray.includes(vehicle.id)) {
                          vehicleWatchlistArray.push(vehicle.id);
                          localStorage.setItem('vehicleWatchlist', JSON.stringify(vehicleWatchlistArray));
                        }
                        
                        showAlert('Added to Watchlist', 'success');
                      }
                    }}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs font-medium backdrop-blur-sm border ${
                      watchlist.has(vehicle.id)
                        ? 'bg-green-600/90 text-white hover:bg-green-700/90 border-green-500/50'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {watchlist.has(vehicle.id) ? (
                      <>
                        <Heart className="h-3 w-3 fill-current" />
                        Watched
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        Watch
                      </>
                    )}
                  </button>
                  <Link 
                    to={`/car/${vehicle.id}`}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs font-medium backdrop-blur-sm shadow-lg shadow-blue-500/25"
                  >
                    <Eye className="h-3 w-3" />
                    Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-800/40 backdrop-blur-lg border border-slate-600 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-[1.02] hover:border-slate-500">
        <div className="relative aspect-[4/3] bg-slate-700 overflow-hidden">
          <CarPhotos 
            carId={vehicle.id} 
            showMultiple={false}
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-blue-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-bold border border-blue-500/50">
              Available
            </span>
          </div>
          {/* VIN */}
          <div className="absolute top-3 right-3">
            <span className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold border border-white/20">
              {vehicle.vin ? vehicle.vin.substring(0, 8) + '...' : 'N/A'}
            </span>
          </div>
          {/* Price */}
          <div className="absolute bottom-3 right-3">
            <span className="bg-green-600/90 backdrop-blur-sm text-white px-2 py-1 rounded text-sm font-bold border border-green-500/50">
              {vehicle.estimatedRetailValue ? formatPrice(vehicle.estimatedRetailValue) : 'Contact'}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-white mb-2">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <div className="space-y-2 mb-4">
            {vehicle.odometer && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Gauge className="h-4 w-4" />
                <span>{vehicle.odometer.toLocaleString()} {vehicle.odometerUnit || 'km'}</span>
              </div>
            )}
            {vehicle.primaryDamage && vehicle.primaryDamage !== 'None' && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Car className="h-4 w-4" />
                <span>{vehicle.primaryDamage}</span>
              </div>
            )}
            {vehicle.locationName && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <MapPin className="h-4 w-4" />
                <span>{vehicle.locationName}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {vehicle.condition && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
                  vehicle.condition === 'Used' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 
                  vehicle.condition === 'Salvage' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 
                  'bg-green-500/20 text-green-300 border-green-500/30'
                }`}>
                  {vehicle.condition}
                </span>
              )}
              {vehicle.type && (
                <span className="px-2 py-1 bg-slate-600/50 text-slate-200 text-xs rounded-full font-medium backdrop-blur-sm border border-slate-500/30">
                  {vehicle.type}
                </span>
              )}
            </div>
            <span className="text-sm text-slate-300 font-medium">
              {vehicle.color || 'N/A'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newWatchlist = new Set(watchlist);
                if (watchlist.has(vehicle.id)) {
                  // Remove from watchlist
                  newWatchlist.delete(vehicle.id);
                  setWatchlist(newWatchlist);
                  
                  // Remove from localStorage IDs
                  localStorage.setItem('watchlist', JSON.stringify(Array.from(newWatchlist)));
                  
                  // Remove from localStorage detailed data
                  const savedWatchlistData = localStorage.getItem('vehicleWatchlistData');
                  if (savedWatchlistData) {
                    const watchlistData: any[] = JSON.parse(savedWatchlistData);
                    const filteredData = watchlistData.filter(item => item.id !== vehicle.id);
                    localStorage.setItem('vehicleWatchlistData', JSON.stringify(filteredData));
                  }
                  
                  // Also remove from vehicleWatchlist (for compatibility)
                  const savedVehicleWatchlist = localStorage.getItem('vehicleWatchlist');
                  if (savedVehicleWatchlist) {
                    const vehicleWatchlistArray: string[] = JSON.parse(savedVehicleWatchlist);
                    const filteredIds = vehicleWatchlistArray.filter(id => id !== vehicle.id);
                    localStorage.setItem('vehicleWatchlist', JSON.stringify(filteredIds));
                  }
                  
                  showAlert('Removed from Watchlist', 'removed');
                } else {
                  // Add to watchlist
                  newWatchlist.add(vehicle.id);
                  setWatchlist(newWatchlist);
                  
                  // Save IDs to localStorage
                  localStorage.setItem('watchlist', JSON.stringify(Array.from(newWatchlist)));
                  
                  // Save detailed vehicle data to localStorage
                  const savedWatchlistData = localStorage.getItem('vehicleWatchlistData');
                  const watchlistData: any[] = savedWatchlistData ? JSON.parse(savedWatchlistData) : [];
                  
                  const detailedVehicleData = {
                    id: vehicle.id,
                    auctionCarId: vehicle.id,
                    carId: vehicle.id,
                    auctionId: 'unknown',
                    lotNumber: `LOT-${vehicle.id.slice(-4)}`,
                    year: vehicle.year || 2020,
                    make: vehicle.make || 'Unknown',
                    model: vehicle.model || 'Unknown',
                    image: vehicle.photoUrls?.[0] || '/placeholder-car.jpg',
                    odometer: vehicle.odometer || 0,
                    damage: vehicle.primaryDamage || 'None',
                    estimatedRetailValue: vehicle.estimatedRetailValue || 0,
                    currentBid: vehicle.estimatedRetailValue || 0,
                    bidCount: 0,
                    reservePrice: vehicle.estimatedRetailValue || 0,
                    isReserveMet: false,
                    auctionStartTime: new Date().toISOString(),
                    auctionEndTime: new Date().toISOString(),
                    isLive: false,
                    location: {
                      city: vehicle.locationCity || 'Unknown',
                      region: 'North America',
                      address: vehicle.locationAddress || 'Unknown',
                      phone: '+1-555-0123',
                      email: 'auction@example.com',
                      username: 'AuctionHouse',
                      auctionJoinDate: new Date().toISOString()
                    },
                    condition: {
                      titleType: vehicle.condition === 'Salvage' ? 'Salvage' : 'Clean',
                      keysStatus: 'Available' as const
                    },
                    addedToWatchlistAt: new Date().toISOString()
                  };
                  
                  // Check if vehicle already exists in detailed data
                  const existingIndex = watchlistData.findIndex(item => item.id === vehicle.id);
                  if (existingIndex === -1) {
                    watchlistData.push(detailedVehicleData);
                    localStorage.setItem('vehicleWatchlistData', JSON.stringify(watchlistData));
                  }
                  
                  // Also save to vehicleWatchlist (for compatibility)
                  const savedVehicleWatchlist = localStorage.getItem('vehicleWatchlist');
                  const vehicleWatchlistArray: string[] = savedVehicleWatchlist ? JSON.parse(savedVehicleWatchlist) : [];
                  if (!vehicleWatchlistArray.includes(vehicle.id)) {
                    vehicleWatchlistArray.push(vehicle.id);
                    localStorage.setItem('vehicleWatchlist', JSON.stringify(vehicleWatchlistArray));
                  }
                  
                  showAlert('Added to Watchlist', 'success');
                }
              }}
              className={`flex-1 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 text-xs font-medium backdrop-blur-sm border ${
                watchlist.has(vehicle.id)
                  ? 'bg-green-600/90 text-white hover:bg-green-700/90 border-green-500/50'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20 border-slate-600 hover:border-slate-500'
              }`}
            >
              {watchlist.has(vehicle.id) ? (
                <>
                  <Heart className="h-3 w-3 fill-current" />
                  Watched
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Watch
                </>
              )}
            </button>
            <Link 
              to={`/car/${vehicle.id}`}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 text-xs font-medium backdrop-blur-sm shadow-lg shadow-blue-500/25"
            >
              <Eye className="h-3 w-3" />
              Details
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Toast Notifications */}
      {alert && (
        <Alert 
          message={alert.message} 
          type={alert.type} 
          onClose={() => setAlert(null)} 
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Vehicle Finder</h1>
          <p className="text-slate-300 mb-6">Search and filter vehicles from our auction inventory</p>
          
          {/* Quick Search Bar */}
          <div className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by make, model, VIN, or lot number..."
                value={searchParams.make || searchParams.model || searchParams.vin || searchParams.lotNumber || ''}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-lg"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-medium"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Search Filters Panel */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="relative overflow-hidden rounded-2xl p-6 sticky top-8 bg-slate-900/50 backdrop-blur-xl border border-slate-700 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="h-5 w-5 text-white" />
                <h2 className="text-xl font-semibold text-white">Search Filters</h2>
                {watchlist.size > 0 && (
                  <div className="ml-auto flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-lg">
                    <Heart className="h-4 w-4 text-green-400 fill-current" />
                    <span className="text-green-400 text-sm font-medium">{watchlist.size}</span>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">Condition</label>
                  <div className="flex flex-wrap gap-2">
                    {filters?.conditions.map((condition) => (
                      <button
                        key={condition}
                        onClick={() => handleInputChange('condition', condition === 'All' ? undefined : condition)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm border ${
                          searchParams.condition === condition || (condition === 'All' && !searchParams.condition)
                            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                            : 'bg-white/10 text-slate-200 border-slate-600 hover:bg-white/20 hover:border-slate-500'
                        }`}
                      >
                        {condition}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Vehicle Type</label>
                  <select
                    value={searchParams.type || ''}
                    onChange={(e) => handleInputChange('type', e.target.value || undefined)}
                    className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-lg"
                  >
                    <option value="" className="bg-slate-800 text-white">All Types</option>
                    {filters?.types.map((type) => (
                      <option key={type} value={type} className="bg-slate-800 text-white">{type}</option>
                    ))}
                  </select>
                </div>

                {/* Year Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Year Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="From"
                        value={searchParams.minYear || ''}
                        onChange={(e) => handleInputChange('minYear', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full bg-transparent border-0 border-b-2 border-slate-600 px-0 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="To"
                        value={searchParams.maxYear || ''}
                        onChange={(e) => handleInputChange('maxYear', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full bg-transparent border-0 border-b-2 border-slate-600 px-0 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Odometer Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Mileage Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Min"
                        value={searchParams.minOdometer || ''}
                        onChange={(e) => handleInputChange('minOdometer', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full bg-transparent border-0 border-b-2 border-slate-600 px-0 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Max"
                        value={searchParams.maxOdometer || ''}
                        onChange={(e) => handleInputChange('maxOdometer', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full bg-transparent border-0 border-b-2 border-slate-600 px-0 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Damage Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Damage Type</label>
                  <select
                    value={searchParams.damageType || ''}
                    onChange={(e) => handleInputChange('damageType', e.target.value || undefined)}
                    className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-lg"
                  >
                    <option value="" className="bg-slate-800 text-white">All Damage Types</option>
                    {filters?.damageTypes.map((damage) => (
                      <option key={damage} value={damage} className="bg-slate-800 text-white">{damage}</option>
                    ))}
                  </select>
                </div>

                {/* Make */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Make</label>
                  <select
                    value={searchParams.make || ''}
                    onChange={(e) => handleInputChange('make', e.target.value || undefined)}
                    className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-lg"
                  >
                    <option value="" className="bg-slate-800 text-white">All Makes</option>
                    {filters?.makes.map((make) => (
                      <option key={make} value={make} className="bg-slate-800 text-white">{make}</option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Model</label>
                  <select
                    value={searchParams.model || ''}
                    onChange={(e) => handleInputChange('model', e.target.value || undefined)}
                    disabled={!searchParams.make}
                    className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-slate-800 text-white">All Models</option>
                    {models.map((model) => (
                      <option key={model} value={model} className="bg-slate-800 text-white">{model}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Location</label>
                  <select
                    value={searchParams.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value || undefined)}
                    className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-lg"
                  >
                    <option value="" className="bg-slate-800 text-white">All Locations</option>
                    {filters?.locations.map((location) => (
                      <option key={location} value={location} className="bg-slate-800 text-white">{location}</option>
                    ))}
                  </select>
                </div>

                {/* VIN / Lot Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">VIN / Lot Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter VIN or Lot #"
                      value={searchParams.vin || searchParams.lotNumber || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.match(/^[A-Z0-9]{17}$/)) {
                          handleInputChange('vin', value);
                          handleInputChange('lotNumber', undefined);
                        } else {
                          handleInputChange('lotNumber', value);
                          handleInputChange('vin', undefined);
                        }
                      }}
                      className="w-full bg-transparent border-0 border-b-2 border-slate-600 px-0 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl backdrop-blur-sm"
                >
                  <Search className="h-5 w-5" />
                  {loading ? 'Searching...' : 'Search Vehicles'}
                </button>

                {/* Clear Filters Button */}
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-all duration-300 font-medium backdrop-blur-sm border border-slate-600 hover:border-slate-500"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Search Results Panel */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-4xl">
              <div className="relative overflow-hidden rounded-2xl p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-700 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Search Results</h2>
                  {searchResults && (
                    <p className="text-white/80 text-sm">
                      {searchResults.totalCount} vehicles found
                    </p>
                  )}
                  {watchlist.size > 0 && (
                    <p className="text-green-400 text-sm font-medium">
                      {watchlist.size} vehicle{watchlist.size !== 1 ? 's' : ''} in watchlist
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadWatchlist}
                    className="p-2 rounded-lg transition-all duration-300 bg-white/10 text-slate-200 hover:bg-white/20 backdrop-blur-sm border border-slate-600 hover:border-slate-500"
                    title="Refresh Watchlist"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  {watchlist.size > 0 && (
                    <button
                      onClick={clearWatchlist}
                      className="p-2 rounded-lg transition-all duration-300 bg-red-500/20 text-red-400 hover:bg-red-500/30 backdrop-blur-sm border border-red-500/30 hover:border-red-500/50"
                      title="Clear Watchlist"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all duration-300 backdrop-blur-sm border ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25' 
                        : 'bg-white/10 text-slate-200 border-slate-600 hover:bg-white/20 hover:border-slate-500'
                    }`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-300 backdrop-blur-sm border ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25' 
                        : 'bg-white/10 text-slate-200 border-slate-600 hover:bg-white/20 hover:border-slate-500'
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              ) : searchResults ? (
                <>
                  {searchResults.vehicles.length > 0 ? (
                    <>
                      <div className={viewMode === 'grid' 
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                        : 'space-y-4'
                      }>
                        {searchResults.vehicles.map((vehicle) => (
                          <VehicleCard 
                            key={vehicle.id} 
                            vehicle={vehicle} 
                            viewMode={viewMode} 
                          />
                        ))}
                      </div>
                      
                      {/* Pagination */}
                      {searchResults.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-8">
                          <button
                            onClick={() => handleInputChange('page', Math.max(1, searchResults.page - 1))}
                            disabled={searchResults.page <= 1}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-slate-600 hover:border-slate-500"
                          >
                            Previous
                          </button>
                          
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, searchResults.totalPages) }, (_, i) => {
                              const pageNum = i + 1;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handleInputChange('page', pageNum)}
                                  className={`px-3 py-2 rounded-lg transition-all duration-300 backdrop-blur-sm border ${
                                    searchResults.page === pageNum
                                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                                      : 'bg-white/10 text-slate-200 border-slate-600 hover:bg-white/20 hover:border-slate-500'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => handleInputChange('page', Math.min(searchResults.totalPages, searchResults.page + 1))}
                            disabled={searchResults.page >= searchResults.totalPages}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-slate-600 hover:border-slate-500"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Car className="h-16 w-16 text-white/60 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No vehicles found</h3>
                      <p className="text-white/80">Try adjusting your search filters</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-white/60 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Start your search</h3>
                  <p className="text-white/80">Use the filters on the left to find vehicles</p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleFinder;
