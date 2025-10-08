import { Calendar, MapPin, Car, Clock, Eye } from 'lucide-react'
import { Badge } from './common/Badge'
import { Button } from './common/Button'

interface Auction {
  id: string
  name: string
  description: string
  startTimeUtc: string
  endTimeUtc: string
  status: string
  locationId: string
  locationName?: string
  vehicleCount: number
  totalRevenue?: number
}

interface AuctionListItemProps {
  auction: Auction
  isSelected: boolean
  onClick: () => void
  onViewDetails: () => void
}

export function AuctionListItem({ auction, isSelected, onClick, onViewDetails }: AuctionListItemProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Draft': return 'neutral'
      case 'Scheduled': return 'warning'
      case 'Ready': return 'info'
      case 'Running': return 'success'
      case 'Ended': return 'neutral'
      case 'Cancelled': return 'error'
      default: return 'neutral'
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      className={`bg-dark-bg-tertiary rounded-lg border border-dark-border p-4 cursor-pointer transition-all duration-200 hover:bg-dark-bg-quaternary hover:shadow-dark-lg ${
        isSelected ? 'border-l-4 border-l-accent-primary bg-dark-bg-quaternary' : ''
      }`}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header with name and status */}
        <div className="flex items-center justify-between">
          <h3 className="text-body-md font-medium text-dark-text-primary truncate flex-1 mr-3">
            {auction.name}
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusBadgeVariant(auction.status)} size="sm">
              {auction.status}
            </Badge>
            <Button
              variant="ghost"
              icon={Eye}
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails(auction.id)
              }}
              size="sm"
              className="text-dark-text-muted hover:text-dark-text-primary"
              title="View Details"
            />
          </div>
        </div>

        {/* Auction ID */}
        <p className="text-body-xs text-dark-text-muted">ID: {auction.id}</p>

        {/* Description */}
        {auction.description && (
          <p className="text-body-sm text-dark-text-secondary line-clamp-2">
            {auction.description}
          </p>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-2">
          {/* Start Time */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-dark-text-muted flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-body-xs text-dark-text-muted">Start Time</p>
              <p className="text-body-sm text-dark-text-primary">
                {formatDateTime(auction.startTimeUtc)}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-dark-text-muted flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-body-xs text-dark-text-muted">Location</p>
              <p className="text-body-sm text-dark-text-primary">
                {auction.locationName || 'Loading location...'}
              </p>
            </div>
          </div>

          {/* Vehicle Count */}
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-dark-text-muted flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-body-xs text-dark-text-muted">Vehicles</p>
              <p className="text-body-sm text-dark-text-primary">
                {auction.vehicleCount} vehicles
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-dark-text-muted flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-body-xs text-dark-text-muted">Duration</p>
              <p className="text-body-sm text-dark-text-primary">
                {Math.ceil((new Date(auction.endTimeUtc).getTime() - new Date(auction.startTimeUtc).getTime()) / (1000 * 60 * 60))} hours
              </p>
            </div>
          </div>
        </div>

        {/* Revenue (if available) */}
        {auction.totalRevenue && auction.totalRevenue > 0 && (
          <div className="pt-2 border-t border-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-body-xs text-dark-text-muted">Total Revenue</span>
              <span className="text-body-sm font-medium text-accent-success">
                ${auction.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
