import { Eye, MapPin, User, Tag } from 'lucide-react'
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
  // Auction info
  auctionId?: string
  auctionName?: string
  saleTime?: string
  nextSale?: string
  highlights?: string[]
  region?: string
}

interface VehicleCardProps {
  vehicle: Vehicle
  onViewDetails: (vehicleId: string) => void
}

export function VehicleCard({ vehicle, onViewDetails }: VehicleCardProps) {
  const { enums } = useEnums()

  const getStatusBadgeColor = (status: string) => {
    const badgeClasses = getEnumBadgeClasses('CarCondition', status)
    return badgeClasses
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Card image failed to load:', vehicle.imagePath)
    e.currentTarget.style.display = 'none'
    const fallback = e.currentTarget.nextElementSibling as HTMLElement
    if (fallback) fallback.classList.remove('hidden')
  }

  const handleImageLoad = () => {
    console.log('Card image loaded successfully:', vehicle.imagePath)
  }

  return (
    <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-32 sm:h-40 md:h-48 lg:h-52 xl:h-56 bg-dark-bg-tertiary overflow-hidden">
        {vehicle.imagePath ? (
          <img
            src={vehicle.imagePath}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : null}
        <div className={`absolute inset-0 bg-dark-bg-tertiary flex items-center justify-center ${vehicle.imagePath ? 'hidden' : ''}`}>
          <div className="text-center text-dark-text-muted">
            <div className="text-xs sm:text-sm font-medium">No Image</div>
            <div className="text-xs">Available</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="neutral" size="sm">
            {getEnumLabel('CarCondition', vehicle.status, enums)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* VIN */}
        <div className="flex items-center gap-1 sm:gap-2 mb-2">
          <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-dark-text-muted flex-shrink-0" />
          <span className="text-xs text-dark-text-muted font-mono truncate">{vehicle.vin}</span>
        </div>
        
        {/* Title */}
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-dark-text-primary mb-2 line-clamp-2">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        
        {/* Additional Info */}
        <div className="text-xs sm:text-sm text-dark-text-secondary mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
            <span className="truncate">
              <span className="font-medium">Condition:</span> {getEnumLabel('CarCondition', vehicle.condition, enums)}
            </span>
            <span className="truncate">
              <span className="font-medium">Mileage:</span> {vehicle.odometer?.toLocaleString()} {vehicle.odometerUnit}
            </span>
          </div>
          {vehicle.damageType && vehicle.damageType !== 'None' && (
            <div className="text-xs text-accent-warning">
              <span className="font-medium">Damage:</span> {getEnumLabel('DamageType', vehicle.damageType, enums)}
            </div>
          )}
        </div>
        
        {/* Meta */}
        <div className="space-y-1 mb-3 sm:mb-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-dark-text-secondary">
            <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{vehicle.ownerName}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-dark-text-secondary">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{vehicle.locationName}</span>
          </div>
        </div>
        
        {/* Action */}
        <Button 
          onClick={() => onViewDetails(vehicle.id)}
          className="w-full"
          icon={Eye}
        >
          <span className="hidden sm:inline">View Details</span>
          <span className="sm:hidden">Details</span>
        </Button>
      </div>
    </div>
  )
}