import { useState, useEffect } from 'react'
import { 
  X, 
  Car, 
  Calendar,
  MapPin, 
  User, 
  Tag,
  DollarSign,
  Gauge,
  Palette,
  Wrench,
  AlertTriangle,
  Loader2,
  Eye
} from 'lucide-react'
import { Button } from './common/Button'
import { Badge } from './common/Badge'
import { apiClient } from '../services/apiClient'
import { useEnums, getEnumLabel, getEnumBadgeClasses } from '../../services/enumService'

interface Vehicle {
  id: string
  vin: string
  make: string
  model: string
  year: number
  odometer: number
  odometerUnit: string
  condition: string
  damageType: string
  bodyStyle: string
  color: string
  ownerId: string
  ownerName?: string
  locationId: string
  locationName?: string
  status: string
  createdAt: string
  imagePath?: string
  imageUrls?: string[]
  description?: string
  price?: number
  estimatedRetailValue?: number
  engineType?: string
  transmission?: string
  fuelType?: string
  driveType?: string
  exteriorColor?: string
  interiorColor?: string
  // Auction info
  auctionId?: string
  auctionName?: string
  saleTime?: string
  nextSale?: string
  highlights?: string[]
  region?: string
}

interface VehicleDetailModalProps {
  vehicleId: string
  onClose: () => void
}

export function VehicleDetailModal({ vehicleId, onClose }: VehicleDetailModalProps) {
  const { enums } = useEnums()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // CRITICAL: Only load data when vehicleId changes
  useEffect(() => {
    loadVehicleData()
  }, [vehicleId]) // Asılılıq massivində YALNIZ "vehicleId" olmalıdır

  const loadVehicleData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading vehicle details for ID:', vehicleId)
      const vehicleData = await apiClient.getVehicleById(vehicleId)
      console.log('Vehicle data received:', vehicleData)
      
      // Process image URLs
      const processedImageUrls = apiClient.processImageUrls(vehicleData)
      console.log('Processed image URLs:', processedImageUrls)
      
      // Transform API data to our Vehicle interface
      const transformedVehicle: Vehicle = {
        id: vehicleData.id,
        vin: vehicleData.vin || '',
        make: vehicleData.make || '',
        model: vehicleData.model || '',
        year: vehicleData.year || 0,
        odometer: vehicleData.odometer || 0,
        odometerUnit: vehicleData.odometerUnit || 'miles',
        condition: vehicleData.condition || '',
        damageType: vehicleData.damageType || '',
        bodyStyle: vehicleData.bodyStyle || vehicleData.type || '',
        color: vehicleData.color || '',
        ownerId: vehicleData.ownerId || '',
        ownerName: vehicleData.ownerName || 'Unknown Owner',
        locationId: vehicleData.locationId || '',
        locationName: vehicleData.locationName || vehicleData.location?.name || 'Unknown Location',
        status: vehicleData.status || 'Available',
        createdAt: vehicleData.createdAt || new Date().toISOString(),
        imagePath: processedImageUrls.length > 0 ? processedImageUrls[0] : undefined,
        imageUrls: processedImageUrls,
        description: vehicleData.description,
        price: vehicleData.price || 0,
        estimatedRetailValue: vehicleData.estimatedRetailValue,
        engineType: vehicleData.engineType,
        transmission: vehicleData.transmission,
        fuelType: vehicleData.fuelType,
        driveType: vehicleData.driveType,
        exteriorColor: vehicleData.exteriorColor,
        interiorColor: vehicleData.interiorColor,
        auctionId: vehicleData.auctionId,
        auctionName: vehicleData.auctionName,
        saleTime: vehicleData.saleTime,
        nextSale: vehicleData.nextSale,
        highlights: vehicleData.highlights || [],
        region: vehicleData.region || 'North America'
      }
      
      setVehicle(transformedVehicle)
    } catch (err) {
      console.error('Failed to load vehicle data:', err)
      setError('Failed to load vehicle details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Excellent': return 'success'
      case 'Good': return 'info'
      case 'Fair': return 'warning'
      case 'Poor': return 'error'
      case 'Salvage': return 'error'
      default: return 'neutral'
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Modal image failed to load:', vehicle?.imageUrls?.[currentImageIndex])
    e.currentTarget.style.display = 'none'
    const fallback = e.currentTarget.nextElementSibling as HTMLElement
    if (fallback) fallback.classList.remove('hidden')
  }

  const handleImageLoad = () => {
    console.log('Modal image loaded successfully:', vehicle?.imageUrls?.[currentImageIndex])
  }

  const nextImage = () => {
    if (vehicle?.imageUrls && vehicle.imageUrls.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % vehicle.imageUrls.length)
    }
  }

  const prevImage = () => {
    if (vehicle?.imageUrls && vehicle.imageUrls.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + vehicle.imageUrls.length) % vehicle.imageUrls.length)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-dark-bg-tertiary rounded-lg border border-dark-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-dark-bg-tertiary rounded-lg border border-dark-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center p-12">
            <AlertTriangle className="w-12 h-12 text-accent-error mx-auto mb-4" />
            <h3 className="text-h3 font-heading text-dark-text-primary mb-2">Vehicle Not Found</h3>
            <p className="text-body-md text-dark-text-secondary mb-6">{error || 'The requested vehicle could not be found.'}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-bg-tertiary rounded-lg border border-dark-border w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <div>
            <h2 className="text-h2 font-heading text-dark-text-primary">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h2>
            <p className="text-body-sm text-dark-text-secondary mt-1">VIN: {vehicle.vin}</p>
          </div>
          <Button variant="ghost" icon={X} onClick={onClose} />
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative bg-dark-bg-quaternary rounded-lg border border-dark-border overflow-hidden">
                <div className="aspect-video bg-dark-bg-tertiary">
                  {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                    <img
                      src={vehicle.imageUrls[currentImageIndex]}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                      onLoad={handleImageLoad}
                    />
                  ) : null}
                  <div className={`absolute inset-0 bg-dark-bg-tertiary flex items-center justify-center ${vehicle.imageUrls && vehicle.imageUrls.length > 0 ? 'hidden' : ''}`}>
                    <div className="text-center text-dark-text-muted">
                      <Car className="w-16 h-16 mx-auto mb-4" />
                      <div className="text-lg font-medium">No Images</div>
                      <div className="text-sm">Available</div>
                    </div>
                  </div>
                </div>

                {/* Image Navigation */}
                {vehicle.imageUrls && vehicle.imageUrls.length > 1 && (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between p-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={prevImage}
                      className="bg-black/50 hover:bg-black/70"
                    >
                      ←
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={nextImage}
                      className="bg-black/50 hover:bg-black/70"
                    >
                      →
                    </Button>
                  </div>
                )}

                {/* Image Counter */}
                {vehicle.imageUrls && vehicle.imageUrls.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {currentImageIndex + 1} / {vehicle.imageUrls.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {vehicle.imageUrls && vehicle.imageUrls.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {vehicle.imageUrls.slice(0, 4).map((imageUrl, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-video bg-dark-bg-quaternary rounded border overflow-hidden transition-all ${
                        currentImageIndex === index ? 'border-accent-primary ring-2 ring-accent-primary/50' : 'border-dark-border hover:border-dark-text-muted'
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Status and Basic Info */}
              <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-h3 font-heading text-dark-text-primary">Vehicle Information</h3>
                  <Badge variant={getStatusBadgeVariant(vehicle.status)} size="sm">
                    {getEnumLabel('CarCondition', vehicle.status, enums)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-dark-text-muted" />
                    <div>
                      <p className="text-body-sm text-dark-text-muted">Year</p>
                      <p className="text-body-md font-medium text-dark-text-primary">{vehicle.year}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Gauge className="w-5 h-5 text-dark-text-muted" />
                    <div>
                      <p className="text-body-sm text-dark-text-muted">Mileage</p>
                      <p className="text-body-md font-medium text-dark-text-primary">
                        {vehicle.odometer?.toLocaleString()} {vehicle.odometerUnit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-dark-text-muted" />
                    <div>
                      <p className="text-body-sm text-dark-text-muted">Color</p>
                      <p className="text-body-md font-medium text-dark-text-primary">{vehicle.color}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-dark-text-muted" />
                    <div>
                      <p className="text-body-sm text-dark-text-muted">Body Style</p>
                      <p className="text-body-md font-medium text-dark-text-primary">{vehicle.bodyStyle}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner and Location */}
              <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border p-6">
                <h3 className="text-h3 font-heading text-dark-text-primary mb-4">Location & Owner</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-dark-text-muted" />
                    <div>
                      <p className="text-body-sm text-dark-text-muted">Owner</p>
                      <p className="text-body-md font-medium text-dark-text-primary">{vehicle.ownerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-dark-text-muted" />
                    <div>
                      <p className="text-body-sm text-dark-text-muted">Location</p>
                      <p className="text-body-md font-medium text-dark-text-primary">{vehicle.locationName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              {(vehicle.engineType || vehicle.transmission || vehicle.fuelType || vehicle.driveType) && (
                <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border p-6">
                  <h3 className="text-h3 font-heading text-dark-text-primary mb-4">Technical Details</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {vehicle.engineType && (
                      <div>
                        <p className="text-body-sm text-dark-text-muted">Engine</p>
                        <p className="text-body-md font-medium text-dark-text-primary">{vehicle.engineType}</p>
                      </div>
                    )}
                    
                    {vehicle.transmission && (
                      <div>
                        <p className="text-body-sm text-dark-text-muted">Transmission</p>
                        <p className="text-body-md font-medium text-dark-text-primary">{vehicle.transmission}</p>
                      </div>
                    )}
                    
                    {vehicle.fuelType && (
                      <div>
                        <p className="text-body-sm text-dark-text-muted">Fuel Type</p>
                        <p className="text-body-md font-medium text-dark-text-primary">{vehicle.fuelType}</p>
                      </div>
                    )}
                    
                    {vehicle.driveType && (
                      <div>
                        <p className="text-body-sm text-dark-text-muted">Drive Type</p>
                        <p className="text-body-md font-medium text-dark-text-primary">{vehicle.driveType}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Damage Information */}
              {vehicle.damageType && vehicle.damageType !== 'None' && (
                <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border p-6">
                  <h3 className="text-h3 font-heading text-dark-text-primary mb-4">Damage Information</h3>
                  
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-accent-warning" />
                    <div>
                      <p className="text-body-sm text-dark-text-muted">Damage Type</p>
                      <p className="text-body-md font-medium text-accent-warning">
                        {getEnumLabel('DamageType', vehicle.damageType, enums)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Information */}
              {(vehicle.price || vehicle.estimatedRetailValue) && (
                <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border p-6">
                  <h3 className="text-h3 font-heading text-dark-text-primary mb-4">Pricing</h3>
                  
                  <div className="space-y-3">
                    {vehicle.price && (
                      <div className="flex justify-between items-center">
                        <span className="text-body-sm text-dark-text-muted">Current Price</span>
                        <span className="text-body-lg font-bold text-accent-success">
                          ${vehicle.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {vehicle.estimatedRetailValue && (
                      <div className="flex justify-between items-center">
                        <span className="text-body-sm text-dark-text-muted">Estimated Retail Value</span>
                        <span className="text-body-md font-medium text-dark-text-primary">
                          ${vehicle.estimatedRetailValue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {vehicle.description && (
                <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border p-6">
                  <h3 className="text-h3 font-heading text-dark-text-primary mb-4">Description</h3>
                  <p className="text-body-md text-dark-text-secondary">{vehicle.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
