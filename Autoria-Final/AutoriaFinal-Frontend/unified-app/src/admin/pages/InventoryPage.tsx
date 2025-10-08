import { useState, useEffect, useCallback } from 'react'
import { 
  Filter, 
  Grid3X3, 
  List, 
  Search, 
  Plus,
  Eye,
  MapPin,
  User,
  Car,
  AlertCircle,
  RefreshCw,
  Settings,
  Tag,
  Loader2
} from 'lucide-react'
import { Button } from '../components/common/Button'
import { Pagination } from '../components/common/Pagination'
import { VehicleCard } from '../components/VehicleCard'
import { VehicleTableRow } from '../components/VehicleTableRow'
import { VehicleDetailModal } from '../components/VehicleDetailModal'
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

interface Filters {
  condition: string
  vehicleType: string
  yearFrom: string
  yearTo: string
  mileageFrom: string
  mileageTo: string
  damageType: string
  make: string
  model: string
  location: string
  seller: string
}

export function InventoryPage() {
  const { enums } = useEnums()
  
  // Core state management
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  
  // View and UI state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showFilters, setShowFilters] = useState(true)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  // Search and filter state (UI only - no automatic API calls)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Filters>({
    condition: '',
    vehicleType: '',
    yearFrom: '',
    yearTo: '',
    mileageFrom: '',
    mileageTo: '',
    damageType: '',
    make: '',
    model: '',
    location: '',
    seller: ''
  })
  
  // CRITICAL: Manual refresh trigger to prevent infinite loops
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

  const pageSize = 12

  // Data loading function - only triggered by refreshKey changes
  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading vehicles with params:', {
        page: currentPage,
        pageSize: pageSize,
        view: viewMode,
        search: searchTerm,
        filters
      })
      
      const response = await apiClient.getVehicles({
        page: currentPage,
        pageSize: pageSize,
        view: viewMode,
        search: searchTerm,
        yearFrom: filters.yearFrom ? parseInt(filters.yearFrom) : undefined,
        yearTo: filters.yearTo ? parseInt(filters.yearTo) : undefined,
        locationId: filters.location,
        sortBy: 'createdAt',
        sortDir: 'desc'
      })

      console.log('API response received:', response)

      // Transform API data to our Vehicle interface
      const transformedVehicles: Vehicle[] = response.items.map((car: any) => {
        const processedImageUrls = apiClient.processImageUrls(car)
        const primaryImageUrl = processedImageUrls.length > 0 ? processedImageUrls[0] : null
        
        return {
          id: car.id,
          vin: car.vin || '',
          make: car.make || '',
          model: car.model || '',
          year: car.year || 0,
          odometer: car.odometer || 0,
          odometerUnit: car.odometerUnit || 'miles',
          condition: car.condition || '',
          damageType: car.damageType || '',
          bodyStyle: car.bodyStyle || car.type || '',
          color: car.color || '',
          ownerId: car.ownerId || '',
          ownerName: car.ownerName || 'Unknown Owner',
          locationId: car.locationId || '',
          locationName: car.locationName || car.location?.name || 'Unknown Location',
          status: car.status || 'Available',
          createdAt: car.createdAt || new Date().toISOString(),
          imagePath: primaryImageUrl,
          imageUrls: processedImageUrls,
          description: car.description,
          price: car.price || 0,
          auctionId: car.auctionId,
          auctionName: car.auctionName,
          saleTime: car.saleTime,
          nextSale: car.nextSale,
          highlights: car.highlights || [],
          region: car.region || 'North America'
        }
      })
      
      setVehicles(transformedVehicles)
      setTotalPages(response.totalPages)
      setTotalItems(response.totalItems)
    } catch (error) {
      console.error('Error loading vehicles:', error)
      
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        setError('Authentication failed. Please login first using the Login button.')
      } else {
        setError('Failed to load vehicles')
      }
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, viewMode, searchTerm, filters])

  // CRITICAL: Only trigger data loading when refreshKey changes
  useEffect(() => {
    loadVehicles()
  }, [refreshKey]) // DİQQƏT: Asılılıq massivində YALNIZ "refreshKey" olmalıdır!

  // Manual refresh trigger
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Search and filter handlers (UI only)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Apply search and filters (manual trigger)
  const handleApplyFilters = () => {
    setCurrentPage(1)
    setRefreshKey(prev => prev + 1)
  }

  // Clear filters and refresh
  const handleClearFilters = () => {
    setFilters({
      condition: '',
      vehicleType: '',
      yearFrom: '',
      yearTo: '',
      mileageFrom: '',
      mileageTo: '',
      damageType: '',
      make: '',
      model: '',
      location: '',
      seller: ''
    })
    setSearchTerm('')
    setCurrentPage(1)
    setRefreshKey(prev => prev + 1)
  }

  // Page change handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setRefreshKey(prev => prev + 1)
  }

  // View details handler
  const handleViewDetails = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId)
    setShowDetailModal(true)
  }

  // Login handler for testing
  const handleLogin = async () => {
    try {
      const email = 'admin@example.com'
      const password = 'admin123'
      
      console.log('Attempting login...')
      const result = await apiClient.login(email, password)
      console.log('Login successful:', result)
      
      // Reload vehicles after successful login
      setTimeout(() => handleRefresh(), 1000)
    } catch (error) {
      console.error('Login failed:', error)
      alert('Login failed. Please check your credentials.')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    const badgeClasses = getEnumBadgeClasses('CarCondition', status)
    return badgeClasses
  }

  const FilterPanel = () => (
    <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-h3 font-heading text-dark-text-primary">Filters</h3>
        <button 
          onClick={handleClearFilters}
          className="text-body-sm text-accent-primary hover:text-accent-primary/80"
        >
          Clear All
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Condition */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Condition</label>
          <select 
            value={filters.condition}
            onChange={(e) => handleFilterChange('condition', e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          >
            <option value="">All Conditions</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
            <option value="Salvage">Salvage</option>
          </select>
        </div>

        {/* Vehicle Type */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Vehicle Type</label>
          <select
            value={filters.vehicleType}
            onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          >
            <option value="">All Types</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="Truck">Truck</option>
            <option value="Coupe">Coupe</option>
            <option value="Convertible">Convertible</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Wagon">Wagon</option>
          </select>
        </div>

        {/* Year Range */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Year Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="number" 
              placeholder="From" 
              value={filters.yearFrom}
              onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
              className="px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
            />
            <input 
              type="number" 
              placeholder="To" 
              value={filters.yearTo}
              onChange={(e) => handleFilterChange('yearTo', e.target.value)}
              className="px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
            />
          </div>
        </div>

        {/* Mileage Range */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Mileage Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="number" 
              placeholder="From"
              value={filters.mileageFrom}
              onChange={(e) => handleFilterChange('mileageFrom', e.target.value)}
              className="px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
            />
            <input 
              type="number" 
              placeholder="To"
              value={filters.mileageTo}
              onChange={(e) => handleFilterChange('mileageTo', e.target.value)}
              className="px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
            />
          </div>
        </div>

        {/* Damage Type */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Damage Type</label>
          <select
            value={filters.damageType}
            onChange={(e) => handleFilterChange('damageType', e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          >
            <option value="">All Damage Types</option>
            <option value="None">None</option>
            <option value="Front End">Front End</option>
            <option value="Rear End">Rear End</option>
            <option value="Side">Side</option>
            <option value="All Over">All Over</option>
            <option value="Water/Flood">Water/Flood</option>
            <option value="Hail">Hail</option>
            <option value="Vandalism">Vandalism</option>
          </select>
        </div>

        {/* Make */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Make</label>
          <input
            type="text"
            placeholder="Search make..."
            value={filters.make}
            onChange={(e) => handleFilterChange('make', e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          />
        </div>

        {/* Model */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Model</label>
          <input
            type="text"
            placeholder="Search model..."
            value={filters.model}
            onChange={(e) => handleFilterChange('model', e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Location</label>
          <input
            type="text"
            placeholder="Search location..."
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          />
        </div>

        {/* Seller */}
        <div>
          <label className="block text-body-sm font-medium text-dark-text-primary mb-2">Seller</label>
          <input
            type="text"
            placeholder="Search seller..."
            value={filters.seller}
            onChange={(e) => handleFilterChange('seller', e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary"
          />
        </div>

        {/* Apply Filters Button */}
        <Button onClick={handleApplyFilters} className="w-full">
          Apply Filters
        </Button>
      </div>
    </div>
  )

  const LoadingSkeleton = () => (
    <>
      {Array.from({ length: pageSize }).map((_, index) => (
        <div key={index} className="bg-dark-bg-quaternary rounded-lg border border-dark-border overflow-hidden">
          <div className="h-48 bg-dark-bg-tertiary animate-pulse"></div>
          <div className="p-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-dark-bg-tertiary rounded animate-pulse mb-2"></div>
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse mb-1"></div>
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse mb-4"></div>
            <div className="h-10 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </>
  )

  const TableLoadingSkeleton = () => (
    <>
      {Array.from({ length: pageSize }).map((_, index) => (
        <tr key={index}>
          <td className="px-6 py-4">
            <div className="w-16 h-12 bg-dark-bg-tertiary rounded-md animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-6 bg-dark-bg-tertiary rounded-full animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-dark-bg-tertiary rounded animate-pulse"></div>
          </td>
        </tr>
      ))}
    </>
  )

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="text-dark-text-muted mb-4">
        <Car className="w-16 h-16 mx-auto" />
      </div>
      <h3 className="text-h3 font-heading text-dark-text-primary mb-2">No vehicles found</h3>
      <p className="text-body-md text-dark-text-secondary mb-6">Try adjusting your filters or add a new vehicle to get started.</p>
      <Button icon={Plus}>
        Add Vehicle
      </Button>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-dark-bg-primary">
      {/* Header */}
      <div className="bg-dark-bg-secondary border-b border-dark-border px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-heading text-dark-text-primary">Inventory Management</h1>
            <p className="text-body-md text-dark-text-secondary mt-1">
              Manage your vehicle inventory ({totalItems} vehicles)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              icon={Settings} 
              onClick={handleLogin}
            >
              Login
            </Button>
            <Button 
              variant="secondary" 
              icon={RefreshCw} 
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button icon={Plus}>
              Add Vehicle
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Filter Panel - Desktop */}
        <div className="w-80 flex-shrink-0 border-r border-dark-border bg-dark-bg-secondary">
          <div className="hidden lg:block h-full overflow-y-auto p-6">
            <FilterPanel />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Controls */}
          <div className="bg-dark-bg-secondary border-b border-dark-border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <Button
                  variant="secondary"
                  icon={Filter}
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden"
                >
                  Filters
                </Button>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-text-muted" />
                  <input
                    type="text"
                    placeholder="Search vehicles..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-dark-bg-tertiary border border-dark-border rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary w-64"
                  />
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  icon={Grid3X3}
                  onClick={() => setViewMode('grid')}
                />
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'secondary'}
                  icon={List}
                  onClick={() => setViewMode('table')}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : ''}>
                {viewMode === 'grid' ? <LoadingSkeleton /> : (
                  <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border overflow-hidden">
                    <table className="min-w-full divide-y divide-dark-border">
                      <thead className="bg-dark-bg-tertiary">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Image</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Sale Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Sale Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Region</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Highlights</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Current Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Next Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-dark-bg-quaternary divide-y divide-dark-border">
                        <TableLoadingSkeleton />
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-accent-error mx-auto mb-4" />
                <h3 className="text-h3 font-heading text-dark-text-primary mb-2">Error loading vehicles</h3>
                <p className="text-body-md text-dark-text-secondary mb-4">{error}</p>
                <Button onClick={handleRefresh} icon={RefreshCw}>
                  Try Again
                </Button>
              </div>
            ) : vehicles.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {vehicles.map((vehicle) => (
                      <VehicleCard 
                        key={vehicle.id} 
                        vehicle={vehicle} 
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-dark-bg-quaternary rounded-lg border border-dark-border overflow-hidden">
                    <table className="min-w-full divide-y divide-dark-border">
                      <thead className="bg-dark-bg-tertiary">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Image</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Sale Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Sale Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Region</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Highlights</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Current Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Next Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-dark-bg-quaternary divide-y divide-dark-border">
                        {vehicles.map((vehicle) => (
                          <VehicleTableRow 
                            key={vehicle.id} 
                            vehicle={vehicle} 
                            onViewDetails={handleViewDetails}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      isLoading={loading}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileFilters(false)}></div>
          <div className="absolute left-0 top-0 h-full w-full max-w-sm bg-dark-bg-secondary shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h3 className="text-h3 font-heading text-dark-text-primary">Filters</h3>
              <Button 
                variant="ghost" 
                icon={Filter}
                onClick={() => setShowMobileFilters(false)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterPanel />
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {showDetailModal && selectedVehicleId && (
        <VehicleDetailModal
          vehicleId={selectedVehicleId}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedVehicleId(null)
          }}
        />
      )}
    </div>
  )
}