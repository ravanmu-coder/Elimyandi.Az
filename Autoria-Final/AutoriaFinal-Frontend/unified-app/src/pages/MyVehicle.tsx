import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/api';
import CarPhotos from '../components/CarPhotos';
import { 
  Car, 
  Calendar, 
  Gauge, 
  Hash, 
  Palette, 
  Fuel, 
  Wrench, 
  MapPin,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { getEnumLabel, getEnumBadgeClasses } from '../services/enumService';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  color: string;
  fuelType?: string;
  damageType?: string;
  bodyStyle?: string;
  mileage?: number;
  price?: number;
  estimatedRetailValue?: number;
  locationId?: string;
  locationName?: string;
  locationAddress?: string;
  locationCity?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  ownerUsername?: string;
  // Specifications fields
  odometer?: number;
  odometerUnit?: string;
  fuel?: string;
  transmission?: string;
  driveTrain?: string;
  condition?: string;
  hasKeys?: boolean;
  primaryDamage?: string;
  secondaryDamage?: string;
  titleType?: string;
  titleState?: string;
}


const MyVehicle: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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

  // Load user's vehicles
  useEffect(() => {
    if (isAuthenticated && user?.user?.roles?.includes('Seller')) {
      loadMyVehicles();
    }
  }, [isAuthenticated, user]);

  const loadMyVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading vehicles from /api/Car...');
      const allVehicles = await apiClient.getCars();
      
      console.log('All vehicles response:', allVehicles);
      
      // Get current user ID for filtering
      const currentUserId = user?.user?.id;
      console.log('Current user ID:', currentUserId);
      
      // Filter vehicles to show only current user's vehicles
      const userVehicles = (allVehicles || []).filter(vehicle => {
        return vehicle.ownerId === currentUserId;
      });
      
      console.log('Filtered user vehicles:', userVehicles);
      
      // Load locations from GET /api/Location
      const locationsData = await apiClient.getLocations();
      console.log('Locations response:', locationsData);
      
      // Process vehicles to ensure we have complete data
      const processedVehicles = await Promise.all(
        userVehicles.map(async (vehicle) => {
          try {
            // Get complete vehicle data from GET /api/Car/{id}
            const completeVehicle = await apiClient.getCar(vehicle.id);
            console.log(`Complete data for vehicle ${vehicle.id}:`, completeVehicle);
            
            // Find location data
            const location = locationsData?.find(loc => loc.id === completeVehicle.locationId);
            
            // Get user profile for owner
            let ownerUsername = '';
            if (completeVehicle.ownerId) {
              try {
                const userProfile = await apiClient.getUserProfile(completeVehicle.ownerId);
                ownerUsername = userProfile.username || userProfile.email || 'Unknown';
              } catch (error) {
                console.error(`Error loading user profile for ${completeVehicle.ownerId}:`, error);
                ownerUsername = 'Unknown';
              }
            }
            
            return {
              id: completeVehicle.id || vehicle.id,
              make: completeVehicle.make || vehicle.make,
              model: completeVehicle.model || vehicle.model,
              year: completeVehicle.year || vehicle.year,
              vin: completeVehicle.vin || vehicle.vin,
              color: completeVehicle.color || vehicle.color,
              fuelType: completeVehicle.fuelType || vehicle.fuelType,
              damageType: completeVehicle.damageType || vehicle.damageType,
              bodyStyle: completeVehicle.bodyStyle || vehicle.bodyStyle,
              mileage: completeVehicle.mileage || vehicle.mileage,
              price: completeVehicle.price || vehicle.price,
              estimatedRetailValue: completeVehicle.estimatedRetailValue,
              locationId: completeVehicle.locationId || vehicle.locationId,
              locationName: location?.name || completeVehicle.locationName,
              locationAddress: location?.addressLine1,
              locationCity: location?.city,
              createdAt: completeVehicle.createdAt || vehicle.createdAt,
              updatedAt: completeVehicle.updatedAt || vehicle.updatedAt,
              ownerId: completeVehicle.ownerId || currentUserId,
              ownerUsername: ownerUsername || user?.user?.email || 'Unknown',
              // Specifications fields
              odometer: completeVehicle.odometer,
              odometerUnit: completeVehicle.odometerUnit,
              fuel: completeVehicle.fuel,
              transmission: completeVehicle.transmission,
              driveTrain: completeVehicle.driveTrain,
              condition: completeVehicle.condition,
              hasKeys: completeVehicle.hasKeys,
              primaryDamage: completeVehicle.primaryDamage,
              secondaryDamage: completeVehicle.secondaryDamage,
              titleType: completeVehicle.titleType,
              titleState: completeVehicle.titleState,
              // Image handling
              imagePath: completeVehicle.imagePath,
              image: completeVehicle.image,
              imageUrl: completeVehicle.imageUrl,
              photoUrls: completeVehicle.photoUrls || []
            };
          } catch (carError) {
            console.error(`Error fetching complete data for vehicle ${vehicle.id}:`, carError);
            // Return basic vehicle data if detailed fetch fails
            return {
              id: vehicle.id,
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              vin: vehicle.vin,
              color: vehicle.color,
              fuelType: vehicle.fuelType,
              damageType: vehicle.damageType,
              bodyStyle: vehicle.bodyStyle,
              mileage: vehicle.mileage,
              price: vehicle.price,
              estimatedRetailValue: vehicle.estimatedRetailValue,
              locationId: vehicle.locationId,
              locationName: vehicle.locationName || vehicle.location?.name,
              locationAddress: vehicle.locationAddress,
              locationCity: vehicle.locationCity,
              createdAt: vehicle.createdAt,
              updatedAt: vehicle.updatedAt,
              ownerId: vehicle.ownerId || currentUserId,
              ownerUsername: vehicle.ownerUsername || user?.user?.email || 'Unknown',
              // Specifications fields
              odometer: vehicle.odometer,
              odometerUnit: vehicle.odometerUnit,
              fuel: vehicle.fuel,
              transmission: vehicle.transmission,
              driveTrain: vehicle.driveTrain,
              condition: vehicle.condition,
              hasKeys: vehicle.hasKeys,
              primaryDamage: vehicle.primaryDamage,
              secondaryDamage: vehicle.secondaryDamage,
              titleType: vehicle.titleType,
              titleState: vehicle.titleState,
              photoUrls: vehicle.photoUrls || []
            };
          }
        })
      );
      
      console.log('Processed vehicles:', processedVehicles);
      setVehicles(processedVehicles);
    } catch (error) {
      console.error('Error loading user vehicles:', error);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = () => {
    navigate('/add-vehicle');
  };

  const handleViewVehicle = (vehicleId: string) => {
    navigate(`/vehicle/${vehicleId}`);
  };

  const handleEditVehicle = (vehicleId: string) => {
    navigate(`/edit-vehicle/${vehicleId}`);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) {
      try {
        setLoading(true);
        console.log('Deleting vehicle:', vehicleId);
        
        await apiClient.deleteCar(vehicleId);
        console.log('Vehicle deleted successfully');
        
        // Remove vehicle from local state immediately for better UX
        setVehicles(prev => prev.filter(v => v.id !== vehicleId));
        
        // Show success message (you can add a toast notification here)
        console.log('Vehicle deleted successfully');
        
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        setError('Failed to delete vehicle. Please try again.');
        
        // Reload the list to ensure consistency
        loadMyVehicles();
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString()}`;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-900 text-lg">Loading your vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #1e1f3b, #2b2f77)',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Vehicles</h1>
            <p className="text-blue-200">Manage your vehicle listings</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadMyVehicles}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleAddVehicle}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-300"
            >
              <Plus className="h-5 w-5" />
              Add Vehicle
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Vehicles Table */}
        {vehicles.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-center">
            <Car className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Vehicles Found</h3>
            <p className="text-blue-200 mb-6">You haven't added any vehicles yet.</p>
            <button
              onClick={handleAddVehicle}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-300"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/20">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Vehicle Details
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Specifications
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-white/5 transition-colors duration-200">
                      {/* Image Column */}
                      <td className="px-3 py-3">
                        <CarPhotos 
                          carId={vehicle.id} 
                          showMultiple={false}
                          className="h-12 w-16"
                        />
                      </td>

                      {/* Vehicle Details Column */}
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-white">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-blue-200 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {vehicle.year}
                            </div>
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {vehicle.vin}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Specifications Column */}
                      <td className="px-4 py-4">
                        <div className="text-xs text-blue-200 space-y-1">
                          <div className="flex items-center gap-1">
                            <Palette className="h-3 w-3" />
                            {vehicle.color || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {vehicle.bodyStyle || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            {getEnumLabel('FuelType', vehicle.fuel || vehicle.fuelType || 'Unknown')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            {vehicle.odometer ? `${vehicle.odometer} ${vehicle.odometerUnit || 'km'}` : 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {vehicle.vin || 'N/A'}
                          </div>
                          {vehicle.transmission && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs">Trans:</span>
                              {getEnumLabel('Transmission', vehicle.transmission)}
                            </div>
                          )}
                          {vehicle.condition && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs">Cond:</span>
                              {getEnumLabel('CarCondition', vehicle.condition)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Location Column */}
                      <td className="px-4 py-4">
                        <div className="text-xs text-blue-200">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {vehicle.locationName || 'N/A'}
                          </div>
                          {vehicle.locationAddress && vehicle.locationCity && (
                            <div className="text-xs text-gray-400 mt-1">
                              {vehicle.locationAddress} - {vehicle.locationCity}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Price Column */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-green-400">
                          {vehicle.estimatedRetailValue ? formatPrice(vehicle.estimatedRetailValue) : 'N/A'}
                        </div>
                        {vehicle.estimatedRetailValue && (
                          <div className="text-xs text-gray-400">
                            Est. Value
                          </div>
                        )}
                      </td>

                      {/* Added Date Column */}
                      <td className="px-4 py-4">
                        <div className="text-xs text-blue-200">
                          <div className="font-medium">
                            {vehicle.ownerUsername || 'Unknown'}
                          </div>
                          <div className="text-gray-400">
                            {formatDate(vehicle.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewVehicle(vehicle.id)}
                            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditVehicle(vehicle.id)}
                            className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                            title="Edit Vehicle"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            className="text-red-400 hover:text-red-300 transition-colors duration-200"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {vehicles.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-blue-200 text-sm">
              Showing {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVehicle;
