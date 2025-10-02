import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ChevronDown,
  X,
  RefreshCw,
  Settings,
  Tag
} from 'lucide-react'
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
  const navigate = useNavigate()
  const { enums } = useEnums()
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showFilters, setShowFilters] = useState(true)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
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

  const pageSize = 12

  useEffect(() => {
    loadVehicles()
  }, [currentPage, searchTerm, filters])

  const loadVehicles = async () => {
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
      console.log('Number of items:', response.items?.length || 0)

      // Transform API data to our Vehicle interface
      const transformedVehicles: Vehicle[] = response.items.map((car: any) => {
        console.log('Processing car:', car)
        console.log('Car image data:', {
          imagePath: car.imagePath,
          imageUrls: car.imageUrls,
          photoUrls: car.photoUrls,
          images: car.images,
          primaryImage: car.primaryImage
        })
        
        const processedImageUrls = apiClient.processImageUrls(car)
        console.log('Processed image URLs:', processedImageUrls)
        
        // Get the primary image URL (first available image)
        const primaryImageUrl = processedImageUrls.length > 0 ? processedImageUrls[0] : null
        console.log('Primary image URL for card:', primaryImageUrl)
        
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

      console.log('Transformed vehicles:', transformedVehicles)
      console.log('Number of transformed vehicles:', transformedVehicles.length)
      
      setVehicles(transformedVehicles)
      setTotalPages(response.totalPages)
      setTotalItems(response.totalItems)
    } catch (error) {
      console.error('Error loading vehicles:', error)
      
      // Show specific error message for authentication
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        setError('Authentication failed. Please login first using the Login button.')
      } else {
        setError('Failed to load vehicles')
      }
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
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
    setCurrentPage(1)
  }

  const handleViewDetails = (vehicle: Vehicle) => {
    // Navigate to VehicleFinder page with the vehicle ID as a search parameter
    navigate(`/vehicle-finder?search=${vehicle.vin || vehicle.id}`)
  }

  const getStatusBadgeColor = (status: string) => {
    // Use enum service for consistent styling
    const badgeClasses = getEnumBadgeClasses('CarCondition', status)
    return badgeClasses
  }

  const FilterPanel = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button 
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700"
              >
          Clear All
              </button>
            </div>
            
            <div className="space-y-6">
        {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select 
                  value={filters.condition}
                  onChange={(e) => handleFilterChange('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
          <select
            value={filters.vehicleType}
            onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Year Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
                    placeholder="From" 
              value={filters.yearFrom}
              onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input 
                    type="number" 
                    placeholder="To" 
              value={filters.yearTo}
              onChange={(e) => handleFilterChange('yearTo', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Mileage Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mileage Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
              placeholder="From"
              value={filters.mileageFrom}
              onChange={(e) => handleFilterChange('mileageFrom', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input 
                    type="number" 
              placeholder="To"
              value={filters.mileageTo}
              onChange={(e) => handleFilterChange('mileageTo', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Damage Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Damage Type</label>
          <select
            value={filters.damageType}
            onChange={(e) => handleFilterChange('damageType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
          <input
            type="text"
            placeholder="Search make..."
            value={filters.make}
            onChange={(e) => handleFilterChange('make', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
          <input
            type="text"
            placeholder="Search model..."
            value={filters.model}
            onChange={(e) => handleFilterChange('model', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <input
            type="text"
            placeholder="Search location..."
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
              </div>

              {/* Seller */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seller</label>
                  <input
                    type="text"
            placeholder="Search seller..."
            value={filters.seller}
            onChange={(e) => handleFilterChange('seller', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
              </div>
            </div>
          </div>
  )

  const VehicleCard = ({ vehicle }: { vehicle: Vehicle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-32 sm:h-40 md:h-48 lg:h-52 xl:h-56 bg-gray-100 overflow-hidden">
        {vehicle.imagePath ? (
          <img
            src={vehicle.imagePath}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              console.log('Card image failed to load:', vehicle.imagePath)
              e.currentTarget.style.display = 'none'
              const fallback = e.currentTarget.nextElementSibling as HTMLElement
              if (fallback) fallback.classList.remove('hidden')
            }}
            onLoad={() => {
              console.log('Card image loaded successfully:', vehicle.imagePath)
            }}
          />
        ) : null}
        <div className={`absolute inset-0 bg-gray-200 flex items-center justify-center ${vehicle.imagePath ? 'hidden' : ''}`}>
          <div className="text-center text-gray-500">
            <div className="text-xs sm:text-sm font-medium">No Image</div>
            <div className="text-xs">Available</div>
                </div>
              </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(vehicle.status)}`}>
            {getEnumLabel('CarCondition', vehicle.status, enums)}
          </span>
            </div>
          </div>

          {/* Content */}
      <div className="p-3 sm:p-4">
        {/* VIN */}
        <div className="flex items-center gap-1 sm:gap-2 mb-2">
          <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 font-mono truncate">{vehicle.vin}</span>
                  </div>
                  
        {/* Title */}
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        
        {/* Additional Info */}
        <div className="text-xs sm:text-sm text-gray-600 mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1">
            <span className="truncate"><span className="font-medium">Condition:</span> {getEnumLabel('CarCondition', vehicle.condition, enums)}</span>
            <span className="truncate"><span className="font-medium">Mileage:</span> {vehicle.odometer?.toLocaleString()} {vehicle.odometerUnit}</span>
                      </div>
          {vehicle.damageType && vehicle.damageType !== 'None' && (
            <div className="text-xs text-orange-600">
              <span className="font-medium">Damage:</span> {getEnumLabel('DamageType', vehicle.damageType, enums)}
                      </div>
          )}
                    </div>
                    
        {/* Meta */}
        <div className="space-y-1 mb-3 sm:mb-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
            <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{vehicle.ownerName}</span>
                  </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">{vehicle.locationName}</span>
                </div>
            </div>
                    
        {/* Action */}
              <button 
          onClick={() => handleViewDetails(vehicle)}
          className="w-full py-2 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-2"
              >
          <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="hidden sm:inline">View in Finder</span>
          <span className="sm:hidden">Finder</span>
              </button>
            </div>
              </div>
  )

  const VehicleTableRow = ({ vehicle }: { vehicle: Vehicle }) => (
    <tr className="hover:bg-gray-50">
      {/* Image */}
      <td className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="w-12 h-8 sm:w-16 sm:h-12 bg-gray-100 rounded-md overflow-hidden">
          {vehicle.imagePath ? (
            <img
              src={vehicle.imagePath}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                              onError={(e) => {
                console.log('Table image failed to load:', vehicle.imagePath)
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
              onLoad={() => {
                console.log('Table image loaded successfully:', vehicle.imagePath)
              }}
            />
          ) : null}
          <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${vehicle.imagePath ? 'hidden' : ''}`}>
            <div className="text-xs text-gray-500 text-center">
              <div>No</div>
              <div>Image</div>
                        </div>
                      </div>
                    </div>
      </td>

      {/* Sale Time */}
      <td className="px-6 py-4 text-sm text-gray-900">
        {vehicle.saleTime ? new Date(vehicle.saleTime).toLocaleDateString() : 'TBD'}
                        </td>

      {/* Sale Name */}
      <td className="px-6 py-4 text-sm text-gray-900">
        {vehicle.auctionName || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        </td>

      {/* Region */}
      <td className="px-6 py-4 text-sm text-gray-900">
        {vehicle.region}
      </td>

      {/* Highlights */}
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="flex flex-wrap gap-1">
          {vehicle.highlights?.slice(0, 2).map((highlight, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {highlight}
                        </span>
          ))}
          {vehicle.highlights && vehicle.highlights.length > 2 && (
            <span className="text-xs text-gray-500">+{vehicle.highlights.length - 2}</span>
          )}
                      </div>
                        </td>

      {/* Current Sale */}
      <td className="px-6 py-4 text-sm text-gray-900">
        {vehicle.saleTime ? new Date(vehicle.saleTime).toLocaleDateString() : 'TBD'}
      </td>

      {/* Next Sale */}
      <td className="px-6 py-4 text-sm text-gray-900">
        {vehicle.nextSale ? new Date(vehicle.nextSale).toLocaleDateString() : 'TBD'}
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(vehicle.status)}`}>
          {getEnumLabel('CarCondition', vehicle.status, enums)}
        </span>
                        </td>

      {/* Action */}
      <td className="px-6 py-4">
                    <button 
          onClick={() => handleViewDetails(vehicle)}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                            <Eye className="w-4 h-4" />
          View in Finder
                    </button>
                        </td>
                    </tr>
  )

  const LoadingSkeleton = () => (
    <>
      {Array.from({ length: pageSize }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-48 bg-gray-200 animate-pulse"></div>
          <div className="p-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
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
            <div className="w-16 h-12 bg-gray-200 rounded-md animate-pulse"></div>
                        </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-6 bg-gray-200 rounded-full animate-pulse"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      </tr>
                    ))}
    </>
  )

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="text-gray-400 mb-4">
        <Car className="w-16 h-16 mx-auto" />
              </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
      <p className="text-gray-500 mb-6">Try adjusting your filters or add a new vehicle to get started.</p>
      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto">
        <Plus className="w-4 h-4" />
        Add Vehicle
      </button>
            </div>
  )


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Manage your vehicle inventory ({totalItems} vehicles)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={async () => {
                try {
                  // You can change these credentials to match your admin user
                  const email = 'admin@example.com' // Change this to your admin email
                  const password = 'admin123' // Change this to your admin password
                  
                  console.log('Attempting login...')
                  const result = await apiClient.login(email, password)
                  console.log('Login successful:', result)
                  
                  // Reload vehicles after successful login
                  setTimeout(() => loadVehicles(), 1000)
                } catch (error) {
                  console.error('Login failed:', error)
                  alert('Login failed. Please check your credentials.')
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Login
            </button>
            <button 
              onClick={loadVehicles}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter Panel - Desktop */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="hidden lg:block">
              <FilterPanel />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Mobile Filter Button */}
                  <button
                    onClick={() => setShowMobileFilters(true)}
                    className="lg:hidden px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vehicles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : ''}>
                {viewMode === 'grid' ? <LoadingSkeleton /> : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highlights</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <TableLoadingSkeleton />
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading vehicles</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={loadVehicles}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : vehicles.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {vehicles.map((vehicle) => (
                      <VehicleCard key={vehicle.id} vehicle={vehicle} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highlights</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Sale</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vehicles.map((vehicle) => (
                          <VehicleTableRow key={vehicle.id} vehicle={vehicle} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                </button>
              </div>
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
          <div className="absolute left-0 top-0 h-full w-full max-w-sm bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}