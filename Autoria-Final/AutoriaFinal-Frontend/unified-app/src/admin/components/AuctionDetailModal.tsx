import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  X, 
  Eye, 
  Play, 
  Square, 
  XCircle, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Car,
  Settings,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  MapPin,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { AddVehicleModal } from './AddVehicleModal'
import { AuctionCarModal } from './AuctionCarModal'
import { useEnums, getEnumLabel, getEnumBadgeClasses } from '../../services/enumService'

// Error Boundary Component
class AuctionDetailErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AuctionDetailModal Error Boundary caught an error:', error, errorInfo)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            </div>
            <p className="text-gray-600 mb-6">
              There was an error loading the auction details. Please try refreshing the page or contact support if the problem persists.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">Debug Info</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

interface AuctionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  auctionId: string | null
  onAuctionUpdated: (auction: any) => void
}

interface AuctionCar {
  id: string
  lotNumber: string
  vin: string
  make: string
  model: string
  year: number
  currentPrice: number
  startingPrice: number
  reservePrice?: number
  status: string
  imageUrl?: string
  auctionId: string
  carId: string
  sold?: boolean
  finalPrice?: number
}

interface Auction {
  id: string
  name: string
  status: string
  startTimeUtc: string
  endTimeUtc: string
  locationId: string
  currency: string
  isLive: boolean
  currentCarId?: string
  timer?: {
    remainingTime: number
    isActive: boolean
  }
}

interface Location {
  id: string
  name: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
  inferred?: boolean
  inferredFromCarId?: string
}


interface AuctionCarStats {
  id: string
  finalPrice?: number
  sumOfBids?: number
  totalRevenue?: number
}

interface CarDetails {
  id: string
  vin?: string
  VIN?: string
  VinNumber?: string
  vinNumber?: string
  make?: string
  model?: string
  year?: number
  photos?: string[]
  files?: string[]
  images?: string[]
  thumbnailUrl?: string
  imageUrl?: string
  thumbnail?: string
  status?: string
  currentPrice?: number
  highestBid?: number
  reservePrice?: number
  startingReserve?: number
}

interface EnhancedAuctionCar extends Omit<AuctionCar, 'vin'> {
  carDetails?: CarDetails
  carDetailsLoading?: boolean
  carDetailsError?: string | null
  vin?: string
  thumbnailUrl?: string
  statusColor?: string
  statusLabel?: string
}

interface OverviewData {
  auction: Auction | null
  location: Location | null
  cars: AuctionCar[]
  totalVehicles: number
  totalRevenue: number
  vehiclesSold: number
  successRate: number
  averagePrice: number
  timeRemaining: string
  loading: boolean
  error: string | null
  locationLoading: boolean
  locationError: string | null
  revenueLoading: boolean
  revenueError: string | null
}

function AuctionDetailModalContent({ isOpen, onClose, auctionId, onAuctionUpdated }: AuctionDetailModalProps) {
  const { enums } = useEnums()
  const [overviewData, setOverviewData] = useState<OverviewData>({
    auction: null,
    location: null,
    cars: [],
    totalVehicles: 0,
    totalRevenue: 0,
    vehiclesSold: 0,
    successRate: 0,
    averagePrice: 0,
    timeRemaining: '',
    loading: false,
    error: null,
    locationLoading: false,
    locationError: null,
    revenueLoading: false,
    revenueError: null
  })
  
  const [activeTab, setActiveTab] = useState<'overview' | 'cars' | 'lifecycle'>('overview')
  const [enhancedCars, setEnhancedCars] = useState<Record<string, EnhancedAuctionCar>>({})
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Cache for API responses (30 seconds TTL)
  const cache = useMemo(() => new Map<string, { data: any; timestamp: number }>(), [])
  const CACHE_TTL = 30000 // 30 seconds
  
  // Lifecycle action states
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [showSetCurrentCarModal, setShowSetCurrentCarModal] = useState(false)
  const [showAuctionCarModal, setShowAuctionCarModal] = useState(false)
  const [selectedAuctionCarId, setSelectedAuctionCarId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [extendMinutes, setExtendMinutes] = useState(30)
  const [extendReason, setExtendReason] = useState('')
  const [currentCarLotNumber, setCurrentCarLotNumber] = useState('')
  const [lifecycleActionLoading, setLifecycleActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && auctionId) {
      loadOverviewData()
    }
  }, [isOpen, auctionId])

  // Utility functions
  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    return null
  }, [cache])

  const setCachedData = useCallback((key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() })
  }, [cache])

  const formatTimeRemaining = useCallback((startTime: string | undefined | null, endTime: string | undefined | null) => {
    try {
      if (!startTime || !endTime) {
        console.warn('formatTimeRemaining: Missing start or end time', { startTime, endTime })
        return 'N/A'
      }

      const now = new Date()
      const start = new Date(startTime)
      const end = new Date(endTime)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn('formatTimeRemaining: Invalid date format', { startTime, endTime })
        return 'N/A'
      }
      
      if (now < start) {
        const diff = start.getTime() - now.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m until start`
        if (hours > 0) return `${hours}h ${minutes}m until start`
        return `${minutes}m until start`
      } else if (now < end) {
        const diff = end.getTime() - now.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      } else {
        return 'Ended'
      }
    } catch (error) {
      console.error('formatTimeRemaining error:', error)
      return 'N/A'
    }
  }, [])

  const formatCurrency = useCallback((amount: number | undefined | null, currency: string = 'USD') => {
    try {
      if (amount == null || isNaN(amount)) {
        console.warn('formatCurrency: Invalid amount', { amount })
        return 'N/A'
      }
      
      const symbols: Record<string, string> = {
        'USD': '$',
        'EUR': '€',
        'AZN': '₼'
      }
      const symbol = symbols[currency] || '$'
      return `${symbol}${amount.toLocaleString()}`
    } catch (error) {
      console.error('formatCurrency error:', error)
      return 'N/A'
    }
  }, [])

  // Safe date formatting utility
  const formatDateSafe = useCallback((value: any, fallback: string = 'N/A'): string => {
    try {
      if (!value) return fallback
      
      let date: Date
      if (value instanceof Date) {
        date = value
      } else if (typeof value === 'string') {
        date = new Date(value)
        if (isNaN(date.getTime())) {
          console.warn(`formatDateSafe: Invalid date string: ${value}`)
          return fallback
        }
      } else if (typeof value === 'number') {
        date = new Date(value)
        if (isNaN(date.getTime())) {
          console.warn(`formatDateSafe: Invalid date number: ${value}`)
          return fallback
        }
      } else {
        console.warn(`formatDateSafe: Unsupported date type: ${typeof value}`)
        return fallback
      }
      
      return date.toLocaleString()
    } catch (error) {
      console.error(`formatDateSafe error for value ${value}:`, error)
      return fallback
    }
  }, [])

  // Safe array access utility
  const safeArrayAccess = useCallback((arr: any[] | undefined | null, index: number, fallback: any = undefined) => {
    if (!Array.isArray(arr) || arr.length === 0 || index < 0 || index >= arr.length) {
      return fallback
    }
    return arr[index]
  }, [])

  // Safe property access utility (currently unused but kept for future use)
  // const safePropertyAccess = useCallback((obj: any, path: string, fallback: any = undefined) => {
  //   try {
  //     const keys = path.split('.')
  //     let current = obj
  //     
  //     for (const key of keys) {
  //       if (current == null || typeof current !== 'object') {
  //         return fallback
  //       }
  //       current = current[key]
  //     }
  //     
  //     return current
  //   } catch (error) {
  //     console.error(`safePropertyAccess error for path ${path}:`, error)
  //     return fallback
  //   }
  // }, [])

  // Enhanced location extraction logic with fallback
  const extractLocationInfo = useCallback((auctionData: any) => {
    console.log('=== LOCATION EXTRACTION DEBUG ===')
    
    // Try all possible location ID sources
    let locationId = null
    let locationSource = ''
    
    // Priority 1: Direct locationId fields
    if (auctionData.locationId) {
      locationId = auctionData.locationId
      locationSource = 'auction.locationId'
    } else if (auctionData.LocationId) {
      locationId = auctionData.LocationId
      locationSource = 'auction.LocationId'
    }
    // Priority 2: Nested location object
    else if (auctionData.location && auctionData.location.id) {
      locationId = auctionData.location.id
      locationSource = 'auction.location.id'
    } else if (auctionData.location && auctionData.location.Id) {
      locationId = auctionData.location.Id
      locationSource = 'auction.location.Id'
    }
    // Priority 3: Venue nested location
    else if (auctionData.venue && auctionData.venue.locationId) {
      locationId = auctionData.venue.locationId
      locationSource = 'auction.venue.locationId'
    } else if (auctionData.venue && auctionData.venue.location && auctionData.venue.location.id) {
      locationId = auctionData.venue.location.id
      locationSource = 'auction.venue.location.id'
    }
    
    console.log('Extracted locationId:', locationId)
    console.log('Location source:', locationSource)
    console.log('Using fallback:', !locationId)
    
    // Check if we have nested location data
    let nestedLocation = null
    if (auctionData.location && typeof auctionData.location === 'object') {
      const loc = auctionData.location
      if (loc.name || loc.Name || loc.city || loc.City || loc.region || loc.Region) {
        nestedLocation = {
          id: locationId,
          name: loc.name || loc.Name || '',
          city: loc.city || loc.City || '',
          region: loc.region || loc.Region || '',
          postalCode: loc.postalCode || loc.PostalCode || loc.postal_code || ''
        }
        console.log('Found nested location data:', nestedLocation)
      }
    }
    
    return { locationId, locationSource, nestedLocation, needsFallback: !locationId && !nestedLocation }
  }, [])

  // Load location data with retry logic and enhanced error handling
  const loadLocationData = useCallback(async (locationId: string, retryCount = 0) => {
    if (!locationId) {
      console.warn('No locationId provided for location loading')
      setOverviewData(prev => ({
        ...prev,
        locationLoading: false,
        locationError: 'Auction üçün location təyin olunmayıb'
      }))
      return null
    }

    // Set loading state
    setOverviewData(prev => ({
      ...prev,
      locationLoading: true,
      locationError: null
    }))

    const cacheKey = `location-${locationId}`
    const cached = getCachedData(cacheKey)
    if (cached) {
      console.log(`Location data loaded from cache for locationId: ${locationId}`)
      setOverviewData(prev => ({
        ...prev,
        location: cached,
        locationLoading: false
      }))
      return cached
    }

    const startTime = Date.now()
    try {
      console.log(`Loading location data for locationId: ${locationId} (attempt ${retryCount + 1})`)
      console.log(`API Call: GET /api/location/${locationId}`)
      
      const location = await apiClient.getLocationById(locationId)
      const duration = Date.now() - startTime
      
      console.log('Location data loaded successfully:', location)
      console.log(`API Response: Status 200, Duration: ${duration}ms`)
      
      setCachedData(cacheKey, location)
      setOverviewData(prev => ({
        ...prev,
        location,
        locationLoading: false
      }))
      
      return location
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(`Error loading location for locationId ${locationId} (attempt ${retryCount + 1}):`, error)
      console.log(`API Error: Status ${error.status || 'N/A'}, Duration: ${duration}ms`)
      
      // Retry logic for server errors and timeouts
      if (retryCount < 2 && (error.status >= 500 || error.code === 'TIMEOUT' || !error.status)) {
        console.log(`Retrying location request in 500ms... (attempt ${retryCount + 2})`)
        await new Promise(resolve => setTimeout(resolve, 500))
        return loadLocationData(locationId, retryCount + 1)
      }
      
      let errorMessage = 'Location məlumatı alınmadı — yenilə'
      
      if (error.status === 401) {
        errorMessage = 'Authentication required - please login'
      } else if (error.status === 403) {
        errorMessage = 'Permission denied - insufficient access rights'
      } else if (error.status === 404) {
        errorMessage = 'Location not found'
      } else if (error.status >= 500) {
        errorMessage = 'Server error - please try again later'
      }
      
      // Set location error for debug information
      setOverviewData(prev => ({
        ...prev,
        locationLoading: false,
        locationError: errorMessage
      }))
      
      return null
    }
  }, [getCachedData, setCachedData])

  // Process car location data
  const processCarLocationData = useCallback(async (carDetails: any, carId: string) => {
    // Check for location in car data
    if (carDetails.locationId || carDetails.LocationId || 
        (carDetails.location && (carDetails.location.id || carDetails.location.Id))) {
      
      const carLocationId = carDetails.locationId || carDetails.LocationId || 
                          carDetails.location?.id || carDetails.location?.Id
      
      console.log(`Found locationId in car ${carId}:`, carLocationId)
      
      // If we have nested location data in car, use it directly
      if (carDetails.location && typeof carDetails.location === 'object') {
        const loc = carDetails.location
        if (loc.name || loc.Name || loc.city || loc.City) {
          return {
            id: carLocationId,
            name: loc.name || loc.Name || '',
            city: loc.city || loc.City || '',
            region: loc.region || loc.Region || '',
            postalCode: loc.postalCode || loc.PostalCode || loc.postal_code || '',
            inferred: true,
            inferredFromCarId: carId
          }
        }
      }
      
      // Otherwise, fetch location details
      if (carLocationId) {
        console.log(`Fetching location details for car ${carId} locationId: ${carLocationId}`)
        const locationDetails = await apiClient.getLocationById(carLocationId)
        console.log(`Location details for car ${carId}:`, locationDetails)
        
        return {
          ...locationDetails,
          inferred: true,
          inferredFromCarId: carId
        }
      }
    }
    
    return null
  }, [])

  // Fallback location loading from cars
  const loadLocationFromCars = useCallback(async (cars: AuctionCar[]) => {
    console.log('=== FALLBACK LOCATION FROM CARS ===')
    console.log('Checking cars for location data:', cars.length, 'cars')
    
    if (!cars || cars.length === 0) {
      console.log('No cars available for location fallback')
      return null
    }

    const BATCH_SIZE = 8
    let foundLocation: Location | null = null
    let inferredFromCarId: string | null = null

    try {
      // Process cars in batches
      for (let i = 0; i < cars.length; i += BATCH_SIZE) {
        const batch = cars.slice(i, i + BATCH_SIZE)
        console.log(`Processing car batch ${Math.floor(i / BATCH_SIZE) + 1}, cars ${i + 1}-${Math.min(i + BATCH_SIZE, cars.length)}`)
        
        const carPromises = batch.map(async (car) => {
          try {
            // Check cache first
            const carCacheKey = `car-${car.carId}`
            const cachedCar = getCachedData(carCacheKey)
            if (cachedCar) {
              console.log(`Car ${car.carId} details loaded from cache`)
              return processCarLocationData(cachedCar, car.carId)
            }
            
            console.log(`Getting car details for carId: ${car.carId}`)
            const carDetails = await apiClient.getVehicleById(car.carId)
            console.log(`Car ${car.carId} details:`, carDetails)
            
            // Cache the car details
            setCachedData(carCacheKey, carDetails)
            
            return processCarLocationData(carDetails, car.carId)
          } catch (error) {
            console.warn(`Error getting car details for ${car.carId}:`, error)
            return null
          }
        })

        const carResults = await Promise.all(carPromises)
        const validLocation = carResults.find(result => result !== null)
        
        if (validLocation) {
          foundLocation = validLocation
          inferredFromCarId = validLocation.inferredFromCarId
          console.log(`Found location from car ${inferredFromCarId}:`, foundLocation)
          break // Stop processing more cars once we find a location
        }
        
        // Small delay between batches
        if (i + BATCH_SIZE < cars.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      if (foundLocation) {
        console.log(`Successfully found location from car ${inferredFromCarId}`)
        setOverviewData(prev => ({
          ...prev,
          location: foundLocation,
          locationLoading: false,
          locationError: null
        }))
        return foundLocation
      } else {
        console.log('No location found in any car')
        setOverviewData(prev => ({
          ...prev,
          locationLoading: false,
          locationError: 'Location məlumatı alınmadı — yenilə'
        }))
        return null
      }
      
    } catch (error) {
      console.error('Error in fallback location loading:', error)
      setOverviewData(prev => ({
        ...prev,
        locationLoading: false,
        locationError: 'Location məlumatı alınmadı — yenilə'
      }))
      return null
    }
  }, [])

  // Load revenue data
  const loadRevenueData = useCallback(async (auctionId: string, cars: AuctionCar[]) => {
    const cacheKey = `revenue-${auctionId}`
    const cached = getCachedData(cacheKey)
    if (cached) return cached

    try {
      // First try dedicated revenue endpoint
      try {
        // Note: This endpoint might not exist, so we'll skip it for now
        // and calculate from individual car stats
        console.log('Revenue endpoint not available, calculating from car stats')
      } catch (revenueError) {
        console.log('Revenue endpoint not available, calculating from car stats')
      }

      // Fallback: Calculate from individual car stats
      if (!cars || cars.length === 0) return 0

      const BATCH_SIZE = 8
      let totalRevenue = 0

      for (let i = 0; i < cars.length; i += BATCH_SIZE) {
        const batch = cars.slice(i, i + BATCH_SIZE)
        const statsPromises = batch.map(car => 
          apiClient.getAuctionCarStats(car.id).catch(() => null)
        )

        const statsResults = await Promise.all(statsPromises)
        const validStats = statsResults.filter(Boolean) as AuctionCarStats[]

        validStats.forEach(stats => {
          const revenue = stats.finalPrice || stats.sumOfBids || stats.totalRevenue || 0
          totalRevenue += revenue
        })

        // Small delay between batches
        if (i + BATCH_SIZE < cars.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setCachedData(cacheKey, totalRevenue)
      return totalRevenue
    } catch (error: any) {
      console.error('Error loading revenue:', error)
      return 0
    }
  }, [getCachedData, setCachedData])

  // Load car details for enhanced display
  const loadCarDetails = useCallback(async (carId: string) => {
    const cacheKey = `car-details-${carId}`
    const cached = getCachedData(cacheKey)
    
    if (cached) {
      console.log(`Car details loaded from cache for carId: ${carId}`)
      return cached
    }

    try {
      console.log(`Loading car details for carId: ${carId}`)
      console.log(`API Call: GET /api/car/${carId}`)
      
      const carDetails = await apiClient.getVehicleById(carId)
      console.log(`Car details loaded successfully:`, carDetails)
      
      setCachedData(cacheKey, carDetails)
      return carDetails
    } catch (error: any) {
      console.error(`Error loading car details for carId ${carId}:`, error)
      return null
    }
  }, [getCachedData, setCachedData])

  // Get status color mapping
  const getStatusColor = useCallback((status: string) => {
    const badgeClasses = getEnumBadgeClasses('AuctionStatus', status)
    // Extract background and text color classes from badge classes
    const bgMatch = badgeClasses.match(/bg-(\w+)-(\d+)/)
    const textMatch = badgeClasses.match(/text-(\w+)-(\d+)/)
    
    if (bgMatch && textMatch) {
      return `${badgeClasses}`
    }
    
    // Fallback to original mapping
    const statusMap: Record<string, string> = {
      'Scheduled': 'bg-yellow-100 text-yellow-800',
      'Prepared': 'bg-blue-100 text-blue-800',
      'Live': 'bg-green-100 text-green-800',
      'Active': 'bg-green-100 text-green-800',
      'Sold': 'bg-purple-100 text-purple-800',
      'Ended': 'bg-gray-100 text-gray-800',
      'Removed': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-red-100 text-red-800'
    }
    return statusMap[status] || 'bg-gray-100 text-gray-800'
  }, [])

  // Enhance auction car data with car details
  const enhanceAuctionCar = useCallback(async (auctionCar: AuctionCar) => {
    const carId = auctionCar.carId
    const auctionCarId = auctionCar.id
    
    // Set loading state
    setEnhancedCars(prev => ({
      ...prev,
      [auctionCarId]: {
        ...auctionCar,
        vin: auctionCar.vin,
        carDetailsLoading: true,
        carDetailsError: null
      }
    }))

    try {
      // Load car details
      const carDetails = await loadCarDetails(carId)
      
      if (carDetails) {
        // Extract VIN from various possible fields with safe access
        const vin = carDetails?.vin || carDetails?.VIN || carDetails?.VinNumber || carDetails?.vinNumber || auctionCar?.vin || 'N/A'
        
        // Extract thumbnail from various possible fields with safe access
        const thumbnailUrl = carDetails?.thumbnailUrl || carDetails?.imageUrl || carDetails?.thumbnail || 
                           safeArrayAccess(carDetails?.photos, 0) ||
                           safeArrayAccess(carDetails?.images, 0) ||
                           safeArrayAccess(carDetails?.files, 0) ||
                           auctionCar?.imageUrl

        // Get status color mapping with safe access
        const statusColor = getStatusColor(auctionCar?.status || 'Unknown')
        
        // Get enum label for status
        const statusLabel = getEnumLabel('AuctionStatus', auctionCar?.status || 'Unknown', enums)
        
        // Get current price from car details or auction car with safe access
        const currentPrice = carDetails?.currentPrice || carDetails?.highestBid || auctionCar?.currentPrice || auctionCar?.startingPrice || 0
        
        // Get reserve price from car details or auction car with safe access
        const reservePrice = carDetails?.reservePrice || carDetails?.startingReserve || auctionCar?.reservePrice

        const enhancedCar: EnhancedAuctionCar = {
          ...auctionCar,
          carDetails,
          carDetailsLoading: false,
          carDetailsError: null,
          vin,
          thumbnailUrl,
          statusColor,
          statusLabel,
          currentPrice,
          reservePrice
        }

        setEnhancedCars(prev => ({
          ...prev,
          [auctionCarId]: enhancedCar
        }))

        console.log(`Enhanced car data for ${carId}:`, enhancedCar)
        return enhancedCar
      } else {
        // Set error state
        setEnhancedCars(prev => ({
          ...prev,
          [auctionCarId]: {
            ...auctionCar,
            vin: auctionCar.vin,
            carDetailsLoading: false,
            carDetailsError: 'Failed to load car details',
            thumbnailUrl: auctionCar.imageUrl,
            statusColor: getStatusColor(auctionCar.status),
            statusLabel: getEnumLabel('AuctionStatus', auctionCar.status, enums)
          }
        }))
        return null
      }
    } catch (error: any) {
      console.error(`Error enhancing auction car ${auctionCarId}:`, error)
      setEnhancedCars(prev => ({
        ...prev,
        [auctionCarId]: {
          ...auctionCar,
          vin: auctionCar.vin,
          carDetailsLoading: false,
          carDetailsError: 'Error loading car details',
          thumbnailUrl: auctionCar.imageUrl,
          statusColor: getStatusColor(auctionCar.status),
          statusLabel: getEnumLabel('AuctionStatus', auctionCar.status, enums)
        }
      }))
      return null
    }
  }, [loadCarDetails, getStatusColor, enums])

  // Load enhanced car data for all cars
  const loadEnhancedCarData = useCallback(async (cars: AuctionCar[]) => {
    console.log('=== LOADING ENHANCED CAR DATA ===')
    console.log(`Loading details for ${cars.length} cars`)
    
    const BATCH_SIZE = 8
    
    // Process cars in batches
    for (let i = 0; i < cars.length; i += BATCH_SIZE) {
      const batch = cars.slice(i, i + BATCH_SIZE)
      console.log(`Processing car batch ${Math.floor(i / BATCH_SIZE) + 1}, cars ${i + 1}-${Math.min(i + BATCH_SIZE, cars.length)}`)
      
      const carPromises = batch.map(car => enhanceAuctionCar(car))
      await Promise.all(carPromises)
      
      // Small delay between batches
      if (i + BATCH_SIZE < cars.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log('Enhanced car data loading completed')
  }, [enhanceAuctionCar])

  // Copy VIN to clipboard
  const copyVinToClipboard = useCallback(async (vin: string) => {
    try {
      await navigator.clipboard.writeText(vin)
      console.log('VIN copied to clipboard:', vin)
    } catch (error) {
      console.error('Failed to copy VIN to clipboard:', error)
    }
  }, [])

  // Main overview data loading function
  const loadOverviewData = useCallback(async () => {
    if (!auctionId) return
    
    setOverviewData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Step 1: Load auction and cars data in parallel with error handling
      let auctionData: any = null
      let carsData: any[] = []
      
      try {
        const [auctionResult, carsResult] = await Promise.allSettled([
        apiClient.getAuctionById(auctionId),
          apiClient.getAuctionCarsByAuction(auctionId)
        ])
        
        if (auctionResult.status === 'fulfilled') {
          auctionData = auctionResult.value
          console.log('Auction data loaded successfully:', auctionData)
        } else {
          console.error('Failed to load auction data:', auctionResult.reason)
          throw new Error('Failed to load auction data')
        }
        
        if (carsResult.status === 'fulfilled') {
          carsData = Array.isArray(carsResult.value) ? carsResult.value : []
          console.log('Cars data loaded successfully:', carsData.length, 'cars')
        } else {
          console.error('Failed to load cars data:', carsResult.reason)
          carsData = [] // Continue with empty cars array
        }
      } catch (error) {
        console.error('Error in parallel data loading:', error)
        throw error
      }

      console.log('=== AUCTION PAYLOAD DEBUG ===')
      console.log('Auction ID:', auctionData?.id)
      console.log('Full auction payload:', JSON.stringify(auctionData, null, 2))
      console.log('Available location fields:', {
        'auction.locationId': auctionData?.locationId,
        'auction.LocationId': auctionData?.LocationId,
        'auction.location': auctionData?.location,
        'auction.venue': auctionData?.venue
      })

      const cars = Array.isArray(carsData) ? carsData : []
      const totalVehicles = cars.length

      // Step 2: Enhanced location data handling with fallback
      const { locationId, locationSource, nestedLocation, needsFallback } = extractLocationInfo(auctionData)
      
      if (locationId && !nestedLocation) {
        // We have a locationId but no nested data, fetch from API
        console.log(`Using locationId from ${locationSource}: ${locationId}`)
        await loadLocationData(locationId)
      } else if (nestedLocation) {
        // We have nested location data, use it directly
        console.log('Using nested auction.location data:', nestedLocation)
        setOverviewData(prev => ({
          ...prev,
          location: nestedLocation,
          locationLoading: false,
          locationError: null
        }))
      } else if (needsFallback) {
        // No location data available, try fallback from cars
        console.log('No locationId found in auction payload, trying fallback from cars')
        setOverviewData(prev => ({
          ...prev,
          locationLoading: true,
          locationError: null
        }))
        await loadLocationFromCars(cars)
      } else {
        // This shouldn't happen, but just in case
        console.warn('Unexpected location extraction state')
        setOverviewData(prev => ({
          ...prev,
          locationLoading: false,
          locationError: 'Location məlumatı alınmadı — yenilə'
        }))
      }

      // Step 3: Load revenue data
      setOverviewData(prev => ({ ...prev, revenueLoading: true }))
      const totalRevenue = await loadRevenueData(auctionId, cars)

      // Step 4: Calculate statistics with safe property access
      const vehiclesSold = cars.filter(car => {
        try {
          return car?.sold === true || (car?.finalPrice && car.finalPrice > 0)
        } catch (error) {
          console.warn('Error checking car sold status:', error)
          return false
        }
      }).length
      
      const successRate = totalVehicles > 0 ? (vehiclesSold / totalVehicles) * 100 : 0
      
      const soldCars = cars.filter(car => {
        try {
          return car?.sold === true || (car?.finalPrice && car.finalPrice > 0)
        } catch (error) {
          console.warn('Error filtering sold cars:', error)
          return false
        }
      })
      
      const averagePrice = soldCars.length > 0 
        ? soldCars.reduce((sum, car) => {
            try {
              return sum + (car?.finalPrice || 0)
            } catch (error) {
              console.warn('Error calculating average price:', error)
              return sum
            }
          }, 0) / soldCars.length 
        : 0

      // Step 5: Calculate time remaining with safe property access
      const timeRemaining = formatTimeRemaining(auctionData?.startTimeUtc, auctionData?.endTimeUtc)

      // Step 6: Update final state (location will be set by loadLocationData)
      setOverviewData(prev => ({
        ...prev,
        auction: auctionData,
        cars,
        totalVehicles,
        totalRevenue,
        vehiclesSold,
        successRate,
        averagePrice,
        timeRemaining,
        loading: false,
        error: null,
        revenueLoading: false,
        revenueError: null
      }))

      // Step 7: Load enhanced car data for vehicles tab
      if (cars.length > 0) {
        loadEnhancedCarData(cars)
      }

    } catch (error: any) {
      console.error('Error loading overview data:', error)
      setOverviewData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load auction data'
      }))
    }
  }, [auctionId, loadLocationData, loadRevenueData, formatTimeRemaining])

  // Refresh function for all data
  const handleRefresh = useCallback(() => {
    cache.clear()
    loadOverviewData()
  }, [cache, loadOverviewData])

  // Refresh function specifically for location data
  const handleLocationRefresh = useCallback(() => {
    if (overviewData.auction) {
      const { locationId, nestedLocation, needsFallback } = extractLocationInfo(overviewData.auction)
      
      if (locationId && !nestedLocation) {
        // Clear cache and reload from API
        const cacheKey = `location-${locationId}`
        cache.delete(cacheKey)
        loadLocationData(locationId)
      } else if (nestedLocation) {
        // For nested data, just reload the overview data
        console.log('Refreshing nested location data')
        loadOverviewData()
      } else if (needsFallback && overviewData.cars) {
        // Clear any cached car data and retry fallback
        console.log('Refreshing fallback location from cars')
        overviewData.cars.forEach(car => {
          const carCacheKey = `car-${car.carId}`
          cache.delete(carCacheKey)
        })
        loadLocationFromCars(overviewData.cars)
      } else {
        console.warn('No location data to refresh')
      }
    }
  }, [overviewData.auction, overviewData.cars, cache, loadLocationData, extractLocationInfo, loadOverviewData, loadLocationFromCars])

  const handleLifecycleAction = async (action: string) => {
    if (!auctionId) return
    
    // Set loading state
    setLifecycleActionLoading(action)
    
    // Clear any previous errors and success messages
    setError(null)
    setSuccessMessage(null)
    
    // Validation for start action
    if (action === 'start') {
      if (!overviewData.cars || overviewData.cars.length === 0) {
        setError('Cannot start auction: No vehicles added')
        setLifecycleActionLoading(null)
        return
      }
      
      const unpreparedCars = overviewData.cars.filter(car => car.status !== 'Prepared')
      if (unpreparedCars.length > 0) {
        setError(`Cannot start auction: ${unpreparedCars.length} vehicles are not prepared`)
        setLifecycleActionLoading(null)
        return
      }
      
      const invalidCars = overviewData.cars.filter(car => !car.lotNumber || car.startingPrice <= 0)
      if (invalidCars.length > 0) {
        setError(`Cannot start auction: ${invalidCars.length} vehicles have invalid lot numbers or prices`)
        setLifecycleActionLoading(null)
        return
      }
    }
    
    try {
      console.log(`Starting ${action} action for auction ${auctionId}`)
      let result
      
      switch (action) {
        case 'start':
          console.log('Calling startAuction API...')
          result = await apiClient.startAuction(auctionId)
          console.log('Start auction result:', result)
          break
        case 'end':
          console.log('Calling endAuction API...')
          result = await apiClient.endAuction(auctionId)
          console.log('End auction result:', result)
          break
        case 'cancel':
          result = await apiClient.cancelAuction(auctionId, cancelReason)
          setShowCancelModal(false)
          setCancelReason('')
          break
        case 'extend':
          result = await apiClient.extendAuction(auctionId, extendMinutes, extendReason)
          setShowExtendModal(false)
          setExtendMinutes(30)
          setExtendReason('')
          break
        case 'nextCar':
          result = await apiClient.moveToNextCar(auctionId)
          break
        case 'setCurrentCar':
          result = await apiClient.setCurrentCar(auctionId, currentCarLotNumber)
          setShowSetCurrentCarModal(false)
          setCurrentCarLotNumber('')
          break
      }
      
      console.log(`${action} action completed successfully`)
      
      // Reload overview data
      await loadOverviewData()
      onAuctionUpdated(result)
      
      // Show success message
      if (action === 'start') {
        console.log('Auction started successfully!')
        setSuccessMessage('Auction started successfully!')
        // Auto-dismiss after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000)
      } else if (action === 'end') {
        setSuccessMessage('Auction ended successfully!')
        // Auto-dismiss after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000)
      }
      
    } catch (err: any) {
      console.error(`Error performing ${action}:`, err)
      
      // Parse server error response for better user feedback
      let errorMessage = `Failed to ${action} auction`
      
      if (err.message) {
        errorMessage = err.message
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.data?.title) {
        errorMessage = err.response.data.title
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      setError(errorMessage)
    } finally {
      // Clear loading state
      setLifecycleActionLoading(null)
    }
  }

  const handleViewAuctionCar = (auctionCarId: string) => {
    setSelectedAuctionCarId(auctionCarId)
    setShowAuctionCarModal(true)
  }

  const handleCarAction = async (carId: string, action: string, data?: any) => {
    try {
      switch (action) {
        case 'prepare':
          await apiClient.prepareAuctionCar(carId)
          break
        case 'activate':
          await apiClient.activateAuctionCar(carId)
          break
        case 'end':
          await apiClient.endAuctionCar(carId)
          break
        case 'markUnsold':
          await apiClient.markAuctionCarUnsold(carId, data.reason)
          break
        case 'updatePrice':
          await apiClient.updateAuctionCarPrice(carId, data.price)
          break
        case 'setHammer':
          await apiClient.setHammerPrice(carId, data.price)
          break
        default:
          throw new Error(`Unknown car action: ${action}`)
      }
      
      // Reload overview data
      await loadOverviewData()
    } catch (err: any) {
      console.error(`Error performing car action ${action}:`, err)
      setError(err.message || `Failed to ${action} car`)
    }
  }

  const getStatusBadge = (status: string, isLive: boolean) => {
    if (isLive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
          Live
        </span>
      )
    }
    
    // Use enum service for status label and styling
    const statusLabel = getEnumLabel('AuctionStatus', status, enums)
    const badgeClasses = getEnumBadgeClasses('AuctionStatus', status)
    
    return (
      <span className={badgeClasses}>
        {statusLabel}
      </span>
    )
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {overviewData.auction?.name || 'Auction Details'}
              </h2>
              <p className="text-sm text-gray-600">
                {overviewData.locationLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading location...
                  </div>
                ) : overviewData.location ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>
                      {overviewData.location.city && overviewData.location.name 
                        ? `${overviewData.location.city} - ${overviewData.location.name}`
                        : overviewData.location.name || 'TBD'
                      }
                    </span>
                    {overviewData.location.inferred && (
                      <span className="text-xs text-gray-500 italic">
                        • inferred from vehicle
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2" title={overviewData.locationError || "Location data unavailable"}>
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="italic">TBD</span>
                    {overviewData.locationError && (
                      <div title={overviewData.locationError}>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                  </div>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          </div>
        </div>

        {/* Loading State */}
        {overviewData.loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading auction details...</p>
          </div>
        ) : (
          <>
            {/* Error State */}
            {overviewData.error && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-600">{overviewData.error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-4 bg-green-50 border-b border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-600">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Action Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'cars', label: 'Vehicles', icon: Car },
                  { id: 'lifecycle', label: 'Controls', icon: Settings }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {activeTab === 'overview' && overviewData.auction && (
                <div className="space-y-6">
                  {/* Status and Timer */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Status</p>
                          <div className="mt-1">
                            {getStatusBadge(overviewData.auction.status, overviewData.auction.isLive)}
                          </div>
                        </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-600">Time Remaining</p>
                            <p className="text-lg font-mono text-gray-900">
                            {overviewData.timeRemaining}
                            </p>
                          </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Location</p>
                            <div className="mt-1">
                              {overviewData.locationLoading ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-sm text-gray-600">Loading...</span>
                                </div>
                              ) : overviewData.location ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {overviewData.location.city && overviewData.location.name 
                                      ? `${overviewData.location.city} - ${overviewData.location.name}`
                                      : overviewData.location.name || 'TBD'
                                    }
                                  </span>
                                  {overviewData.location.inferred && (
                                    <span className="text-xs text-gray-500 italic">
                                      • inferred from vehicle
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2" title={overviewData.locationError || "Location data unavailable"}>
                                  <span className="text-sm text-gray-500 italic">TBD</span>
                                  {overviewData.locationError && (
                                    <div title={overviewData.locationError}>
                                      <AlertCircle className="w-4 h-4 text-red-400" />
                          </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {overviewData.auction?.locationId && (
                          <button
                            onClick={handleLocationRefresh}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Refresh location data"
                          >
                            <RefreshCw className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Car className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {overviewData.totalVehicles}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                          <div className="flex items-center gap-2">
                          <p className="text-2xl font-semibold text-gray-900">
                              {overviewData.revenueLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                              ) : (
                                formatCurrency(overviewData.totalRevenue, overviewData.auction.currency)
                              )}
                            </p>
                            {overviewData.revenueError && (
                              <span className="text-xs text-red-600" title={overviewData.revenueError}>
                                (partial)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auction Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Auction Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Start Time</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {formatDateSafe(overviewData?.auction?.startTimeUtc)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">End Time</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {formatDateSafe(overviewData?.auction?.endTimeUtc)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Location Details
                          </p>
                          <div className="mt-1">
                            {overviewData.locationLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm text-gray-600">Loading location...</span>
                              </div>
                            ) : overviewData.location ? (
                              <div className="space-y-1" title={`Location source: api/location/${overviewData.location.id || overviewData.auction?.locationId}`}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {overviewData.location.city && overviewData.location.name 
                                      ? `${overviewData.location.city} - ${overviewData.location.name}`
                                      : overviewData.location.name || 'TBD'
                                    }
                                  </span>
                                  {overviewData.location.inferred && (
                                    <span className="text-xs text-gray-500 italic">
                                      • inferred from vehicle
                                    </span>
                                  )}
                                </div>
                                <div className="ml-6 space-y-1 text-xs text-gray-600">
                                  {overviewData.location.name && (
                                    <div>Name: {overviewData.location.name}</div>
                                  )}
                                  {overviewData.location.city && (
                                    <div>City: {overviewData.location.city}</div>
                                  )}
                                  {overviewData.location.region && (
                                    <div>Region: {overviewData.location.region}</div>
                                  )}
                                  {overviewData.location.postalCode && (
                                    <div>Postal Code: {overviewData.location.postalCode}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2" title={overviewData.locationError || "Location data unavailable - server error or location not found"}>
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-500 italic">TBD</span>
                                {overviewData.locationError && (
                                  <div title={overviewData.locationError}>
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Currency</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {overviewData.auction.currency}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Statistics
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Vehicles Sold</span>
                          <span className="text-sm font-medium text-gray-900">
                            {overviewData.vehiclesSold} / {overviewData.totalVehicles}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Success Rate</span>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(overviewData.successRate)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Average Price</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(Math.round(overviewData.averagePrice), overviewData.auction.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cars' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Auction Vehicles</h3>
                    <button 
                      onClick={() => setShowAddVehicleModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Vehicle
                    </button>
                  </div>

                  {overviewData.loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading vehicles...</p>
                    </div>
                  ) : overviewData.cars.length === 0 ? (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No vehicles assigned to this auction</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              VIN
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vehicle
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Lot #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Current Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reserve
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Array.isArray(overviewData.cars) ? overviewData.cars.map((car) => {
                            if (!car?.id) {
                              console.warn('Car missing ID:', car)
                              return null
                            }
                            const enhancedCar = enhancedCars[car.id]
                            const displayCar = enhancedCar || car
                            
                            return (
                            <tr key={car.id} className="hover:bg-gray-50">
                                {/* VIN Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-12 w-12">
                                      {displayCar.carDetailsLoading ? (
                                        <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        </div>
                                      ) : displayCar.thumbnailUrl ? (
                                        <img 
                                          className="h-12 w-12 rounded-lg object-cover" 
                                          src={displayCar.thumbnailUrl} 
                                          alt="Car thumbnail"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                          }}
                                        />
                                    ) : (
                                      <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                        <Car className="w-6 h-6 text-gray-400" />
                                      </div>
                                    )}
                                      {displayCar.thumbnailUrl && (
                                        <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center hidden">
                                        <Car className="w-6 h-6 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-4">
                                      <div 
                                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                        title={`Click to copy VIN: ${displayCar.vin || 'N/A'}`}
                                        onClick={() => copyVinToClipboard(displayCar.vin || 'N/A')}
                                      >
                                        VIN: {displayCar.vin || 'N/A'}
                                    </div>
                                      {displayCar.carDetailsError && (
                                        <div className="text-xs text-red-500">
                                          {displayCar.carDetailsError}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </td>
                                
                                {/* Vehicle Column */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {displayCar?.year || 'N/A'} {displayCar?.make || 'N/A'} {displayCar?.model || 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {displayCar?.carDetailsLoading ? 'Loading...' : 'Vehicle Details'}
                                  </div>
                                </td>
                                
                                {/* Lot # Column */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {car?.lotNumber || 'N/A'}
                              </td>
                                
                                {/* Current Price Column */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(displayCar?.currentPrice || car?.currentPrice || car?.startingPrice, overviewData?.auction?.currency || 'USD')}
                              </td>
                                
                                {/* Reserve Column */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {displayCar?.reservePrice ? formatCurrency(displayCar.reservePrice, overviewData?.auction?.currency || 'USD') : 'No Reserve'}
                              </td>
                                
                                {/* Status Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${displayCar?.statusColor || 'bg-gray-100 text-gray-800'}`}>
                                    {displayCar?.statusLabel || car?.status || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => handleViewAuctionCar(car?.id)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="View Car Details"
                                    disabled={!car?.id}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleCarAction(car?.id, 'prepare')}
                                    disabled={!car?.id || car?.status === 'Active' || car?.status === 'Ended'}
                                    className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Prepare Car"
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleCarAction(car?.id, 'activate')}
                                    disabled={!car?.id || car?.status !== 'Prepared'}
                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Activate Car"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleCarAction(car?.id, 'end')}
                                    disabled={!car?.id || car?.status !== 'Active'}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="End Car"
                                  >
                                    <Square className="w-4 h-4" />
                                  </button>
                                  <button className="text-gray-600 hover:text-gray-900">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button className="text-red-600 hover:text-red-900">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            )
                          }) : []}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'lifecycle' && overviewData.auction && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Auction Lifecycle Controls</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Start Auction */}
                    <button
                      onClick={() => handleLifecycleAction('start')}
                      disabled={overviewData.auction.status === 'Live' || overviewData.auction.isLive || lifecycleActionLoading === 'start'}
                      className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {lifecycleActionLoading === 'start' ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                        ) : (
                          <Play className="w-5 h-5 text-green-600" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium text-green-900">
                            {lifecycleActionLoading === 'start' ? 'Starting...' : 'Start Auction'}
                          </p>
                          <p className="text-xs text-green-700">
                            {lifecycleActionLoading === 'start' ? 'Please wait...' : 'Begin the auction'}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* End Auction */}
                    <button
                      onClick={() => handleLifecycleAction('end')}
                      disabled={overviewData.auction.status !== 'Live' && !overviewData.auction.isLive || lifecycleActionLoading === 'end'}
                      className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {lifecycleActionLoading === 'end' ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <Square className="w-5 h-5 text-red-600" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium text-red-900">
                            {lifecycleActionLoading === 'end' ? 'Ending...' : 'End Auction'}
                          </p>
                          <p className="text-xs text-red-700">
                            {lifecycleActionLoading === 'end' ? 'Please wait...' : 'Stop the auction'}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Cancel Auction */}
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={overviewData.auction.status === 'Completed' || overviewData.auction.status === 'Cancelled'}
                      className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-orange-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-orange-900">Cancel Auction</p>
                          <p className="text-xs text-orange-700">Cancel with reason</p>
                        </div>
                      </div>
                    </button>

                    {/* Extend Auction */}
                    <button
                      onClick={() => setShowExtendModal(true)}
                      disabled={overviewData.auction.status !== 'Live' && !overviewData.auction.isLive}
                      className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-blue-900">Extend Auction</p>
                          <p className="text-xs text-blue-700">Add more time</p>
                        </div>
                      </div>
                    </button>

                    {/* Move to Next Car */}
                    <button
                      onClick={() => handleLifecycleAction('nextCar')}
                      disabled={overviewData.auction.status !== 'Live' && !overviewData.auction.isLive}
                      className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Car className="w-5 h-5 text-purple-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-purple-900">Next Car</p>
                          <p className="text-xs text-purple-700">Move to next vehicle</p>
                        </div>
                      </div>
                    </button>

                    {/* Set Current Car */}
                    <button
                      onClick={() => setShowSetCurrentCarModal(true)}
                      disabled={overviewData.auction.status !== 'Live' && !overviewData.auction.isLive}
                      className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-indigo-900">Set Current Car</p>
                          <p className="text-xs text-indigo-700">Select by lot number</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Auction</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for cancellation *
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter reason for cancellation"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleLifecycleAction('cancel')}
                      disabled={!cancelReason.trim()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extend Modal */}
        {showExtendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Extend Auction</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Extension Time (minutes) *
                    </label>
                    <input
                      type="number"
                      value={extendMinutes}
                      onChange={(e) => setExtendMinutes(parseInt(e.target.value))}
                      min="1"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for extension
                    </label>
                    <textarea
                      value={extendReason}
                      onChange={(e) => setExtendReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter reason for extension"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowExtendModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleLifecycleAction('extend')}
                      disabled={!extendMinutes || extendMinutes < 1}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Extend Auction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Set Current Car Modal */}
        {showSetCurrentCarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Set Current Car</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lot Number *
                    </label>
                    <input
                      type="text"
                      value={currentCarLotNumber}
                      onChange={(e) => setCurrentCarLotNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter lot number"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowSetCurrentCarModal(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleLifecycleAction('setCurrentCar')}
                      disabled={!currentCarLotNumber.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set Current Car
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auction Car Modal */}
        <AuctionCarModal
          isOpen={showAuctionCarModal}
          onClose={() => {
            setShowAuctionCarModal(false)
            setSelectedAuctionCarId(null)
          }}
          auctionCarId={selectedAuctionCarId}
          onCarUpdated={() => {
            // Reload overview data when car is updated
            loadOverviewData()
          }}
        />

        {/* Add Vehicle Modal */}
        <AddVehicleModal
          isOpen={showAddVehicleModal}
          onClose={() => setShowAddVehicleModal(false)}
          auctionId={auctionId || ''}
          onSuccess={() => {
            setShowAddVehicleModal(false)
            // Reload overview data when vehicle is added
            loadOverviewData()
          }}
        />
      </div>
    </div>
  )
}

// Export with Error Boundary wrapper
export function AuctionDetailModal(props: AuctionDetailModalProps) {
  const handleError = useCallback((error: Error) => {
    console.error('AuctionDetailModal error:', error)
    // Could send to error reporting service here
  }, [])

  return (
    <AuctionDetailErrorBoundary onError={handleError}>
      <AuctionDetailModalContent {...props} />
    </AuctionDetailErrorBoundary>
  )
}
