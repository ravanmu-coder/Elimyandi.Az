import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Filter, Download, Eye, Edit, Trash2, RefreshCw, Bug, Settings, Loader2 } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { NewAuctionModal } from '../components/NewAuctionModal'
import { EditAuctionModal } from '../components/EditAuctionModal'
import { DeleteAuctionModal } from '../components/DeleteAuctionModal'
import { AuctionDetailModal } from '../components/AuctionDetailModal'
import { AddVehicleModal } from '../components/AddVehicleModal'
import { DebugPanel } from '../components/DebugPanel'
import { ConfigModal } from '../components/ConfigModal'
import { useEnums, getEnumLabel, getEnumBadgeClasses } from '../../services/enumService'

interface Auction {
  id: string
  name: string
  status: string
  startTimeUtc: string
  endTimeUtc: string
  locationId: string
  location?: {
    name: string
    city: string
  }
  totalCarsCount: number
  soldCarsCount: number
  totalRevenue: number
  isLive: boolean
}

interface LocationData {
  id: string
  name: string
  city?: string
}

interface AuctionCarData {
  id: string
  auctionId: string
  carId: string
  lotNumber: string
  status: string
}

interface AuctionCarStats {
  id: string
  totalRevenue?: number
  finalPrice?: number
  hammerPrice?: number
  sumOfBids?: number
}

interface AuctionRowData {
  location?: LocationData
  vehiclesCount?: number
  revenue?: number
  locationLoading: boolean
  vehiclesLoading: boolean
  revenueLoading: boolean
  locationError?: string
  vehiclesError?: string
  revenueError?: string
}

interface DebugCall {
  id: string
  url: string
  method: string
  status: number
  duration: number
  timestamp: Date
  error?: string
}

export function AuctionsListPage() {
  const { enums } = useEnums()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    region: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [currentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  
  // Dynamic data state
  const [auctionRowData, setAuctionRowData] = useState<Record<string, AuctionRowData>>({})
  const [debugCalls, setDebugCalls] = useState<DebugCall[]>([])
  
  // Cache for API responses (30 seconds TTL)
  const cache = useMemo(() => new Map<string, { data: any; timestamp: number }>(), [])
  const CACHE_TTL = 30000 // 30 seconds
  
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

  const addDebugCall = useCallback((call: Omit<DebugCall, 'id'>) => {
    const debugCall: DebugCall = {
      ...call,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    setDebugCalls(prev => [debugCall, ...prev.slice(0, 99)]) // Keep last 100 calls
  }, [])

  const makeApiCall = useCallback(async <T,>(
    endpoint: string,
    method: string = 'GET',
    cacheKey?: string
  ): Promise<T> => {
    const startTime = Date.now()
    
    // Check cache first
    if (cacheKey) {
      const cached = getCachedData(cacheKey)
      if (cached) {
        addDebugCall({
          url: endpoint,
          method,
          status: 200,
          duration: Date.now() - startTime,
          timestamp: new Date()
        })
        return cached
      }
    }

    try {
      let result: T
      if (method === 'GET') {
        if (endpoint.includes('/api/location/')) {
          result = await apiClient.getLocationById(endpoint.split('/').pop()!) as T
        } else if (endpoint.includes('/api/auctioncar/auction/')) {
          result = await apiClient.getAuctionCarsByAuction(endpoint.split('/').pop()!) as T
        } else if (endpoint.includes('/api/auctioncar/') && endpoint.includes('/stats')) {
          const carId = endpoint.split('/').slice(-2, -1)[0]
          result = await apiClient.getAuctionCarStats(carId) as T
        } else {
          // For other endpoints, we'll need to implement specific methods
          throw new Error(`Endpoint ${endpoint} not supported`)
        }
      } else {
        // For non-GET requests, we'll need to implement specific methods
        throw new Error(`Method ${method} not supported for endpoint ${endpoint}`)
      }

      const duration = Date.now() - startTime
      addDebugCall({
        url: endpoint,
        method,
        status: 200,
        duration,
        timestamp: new Date()
      })

      // Cache successful responses
      if (cacheKey) {
        setCachedData(cacheKey, result)
      }

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      const status = error.message?.includes('404') ? 404 : 
                   error.message?.includes('401') ? 401 :
                   error.message?.includes('403') ? 403 : 500
      
      addDebugCall({
        url: endpoint,
        method,
        status,
        duration,
        timestamp: new Date(),
        error: error.message
      })

      throw error
    }
  }, [getCachedData, setCachedData, addDebugCall])

  // Load location data for an auction
  const loadLocationData = useCallback(async (auctionId: string, locationId: string) => {
    if (!locationId) return

    setAuctionRowData(prev => ({
      ...prev,
      [auctionId]: {
        ...prev[auctionId],
        locationLoading: true,
        locationError: undefined
      }
    }))

    try {
      const location = await makeApiCall<LocationData>(
        `/api/location/${locationId}`,
        'GET',
        `location-${locationId}`
      )

      setAuctionRowData(prev => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          location,
          locationLoading: false
        }
      }))
    } catch (error: any) {
      setAuctionRowData(prev => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          locationLoading: false,
          locationError: error.message
        }
      }))
    }
  }, [makeApiCall])

  // Load vehicles count for an auction
  const loadVehiclesData = useCallback(async (auctionId: string) => {
    setAuctionRowData(prev => ({
      ...prev,
      [auctionId]: {
        ...prev[auctionId],
        vehiclesLoading: true,
        vehiclesError: undefined
      }
    }))

    try {
      const cars = await makeApiCall<AuctionCarData[]>(
        `/api/auctioncar/auction/${auctionId}`,
        'GET',
        `vehicles-${auctionId}`
      )

      setAuctionRowData(prev => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          vehiclesCount: Array.isArray(cars) ? cars.length : 0,
          vehiclesLoading: false
        }
      }))
    } catch (error: any) {
      setAuctionRowData(prev => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          vehiclesLoading: false,
          vehiclesError: error.message
        }
      }))
    }
  }, [makeApiCall])

  // Load revenue data for an auction
  const loadRevenueData = useCallback(async (auctionId: string) => {
    setAuctionRowData(prev => ({
      ...prev,
      [auctionId]: {
        ...prev[auctionId],
        revenueLoading: true,
        revenueError: undefined
      }
    }))

    try {
      // First try to get revenue from dedicated endpoint
      try {
        const revenue = await makeApiCall<{ totalRevenue: number }>(
          `/api/auction/${auctionId}/revenue`,
          'GET',
          `revenue-${auctionId}`
        )
        
        setAuctionRowData(prev => ({
          ...prev,
          [auctionId]: {
            ...prev[auctionId],
            revenue: revenue.totalRevenue || 0,
            revenueLoading: false
          }
        }))
        return
      } catch (revenueError) {
        // Fallback to calculating from individual car stats
        console.log('Revenue endpoint not available, calculating from car stats')
      }

      // Fallback: Get cars and calculate revenue from stats
      const cars = await makeApiCall<AuctionCarData[]>(
        `/api/auctioncar/auction/${auctionId}`,
        'GET',
        `vehicles-${auctionId}`
      )

      if (!Array.isArray(cars) || cars.length === 0) {
        setAuctionRowData(prev => ({
          ...prev,
          [auctionId]: {
            ...prev[auctionId],
            revenue: 0,
            revenueLoading: false
          }
        }))
        return
      }

      // Get stats for each car (limit to 50 cars for performance)
      const carsToProcess = cars.slice(0, 50)
      const statsPromises = carsToProcess.map(car => 
        makeApiCall<AuctionCarStats>(
          `/api/auctioncar/${car.id}/stats`,
          'GET',
          `stats-${car.id}`
        ).catch(() => null) // Don't fail entire calculation if one car fails
      )

      const statsResults = await Promise.all(statsPromises)
      const validStats = statsResults.filter(Boolean) as AuctionCarStats[]

      // Calculate total revenue from available stats
      let totalRevenue = 0
      validStats.forEach(stats => {
        // Try different revenue fields in order of preference
        const revenue = stats.totalRevenue || 
                       stats.finalPrice || 
                       stats.hammerPrice || 
                       stats.sumOfBids || 
                       0
        totalRevenue += revenue
      })

      setAuctionRowData(prev => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          revenue: totalRevenue,
          revenueLoading: false
        }
      }))
    } catch (error: any) {
      setAuctionRowData(prev => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          revenueLoading: false,
          revenueError: error.message
        }
      }))
    }
  }, [makeApiCall])

  // Load all dynamic data for an auction
  const loadAuctionDynamicData = useCallback(async (auction: Auction) => {
    const auctionId = auction.id
    
    // Initialize row data
    setAuctionRowData(prev => ({
      ...prev,
      [auctionId]: {
        ...prev[auctionId],
        locationLoading: false,
        vehiclesLoading: false,
        revenueLoading: false
      }
    }))

    // Load all data in parallel
    const promises = []
    
    if (auction.locationId) {
      promises.push(loadLocationData(auctionId, auction.locationId))
    }
    
    promises.push(loadVehiclesData(auctionId))
    promises.push(loadRevenueData(auctionId))

    await Promise.allSettled(promises)
  }, [loadLocationData, loadVehiclesData, loadRevenueData])

  // Load dynamic data for all auctions with throttling
  const loadAllDynamicData = useCallback(async (auctionsList: Auction[]) => {
    const BATCH_SIZE = 8 // Limit concurrent requests
    
    for (let i = 0; i < auctionsList.length; i += BATCH_SIZE) {
      const batch = auctionsList.slice(i, i + BATCH_SIZE)
      const promises = batch.map(auction => loadAuctionDynamicData(auction))
      await Promise.allSettled(promises)
      
      // Small delay between batches to prevent overwhelming the server
      if (i + BATCH_SIZE < auctionsList.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }, [loadAuctionDynamicData])
  
  // Modal states
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)

  useEffect(() => {
    loadAuctions()
  }, [currentPage, filters])

  const loadAuctions = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiClient.getAuctions({
        page: currentPage,
        limit: 10,
        status: filters.status,
        region: filters.region,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      })

      setAuctions(data || [])
      
      // Load dynamic data for all auctions
      if (data && data.length > 0) {
        loadAllDynamicData(data)
      }
    } catch (err: any) {
      console.error('Error loading auctions:', err)
      setError(err.message || 'Failed to load auctions')
      setAuctions([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, isLive: boolean) => {
    if (isLive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Live
        </span>
      )
    }
    
    // Try to get enum label for status
    const statusLabel = getEnumLabel('AuctionStatus', status, enums)
    const badgeClasses = getEnumBadgeClasses('AuctionStatus', status)
    
    return (
      <span className={badgeClasses}>
        {statusLabel}
      </span>
    )
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleClearFilters = () => {
    setFilters({
      status: '',
      region: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    })
  }


  const handleRefresh = () => {
    // Clear cache
    cache.clear()
    // Clear dynamic data
    setAuctionRowData({})
    // Reload auctions and dynamic data
    loadAuctions()
  }

  // Modal handlers
  const handleViewAuction = (auction: Auction) => {
    setSelectedAuction(auction)
    setShowDetailModal(true)
  }

  const handleEditAuction = (auction: Auction) => {
    setSelectedAuction(auction)
    setShowEditModal(true)
  }

  const handleDeleteAuction = (auction: Auction) => {
    setSelectedAuction(auction)
    setShowDeleteModal(true)
  }

  const handleAddVehicle = (auction: Auction) => {
    setSelectedAuction(auction)
    setShowAddVehicleModal(true)
  }

  const handleAuctionCreated = () => {
    loadAuctions() // Refresh the list
    setShowNewModal(false)
  }

  const handleAuctionUpdated = () => {
    loadAuctions() // Refresh the list
    setShowEditModal(false)
    setSelectedAuction(null)
  }

  const handleAuctionDeleted = () => {
    loadAuctions() // Refresh the list
    setShowDeleteModal(false)
    setSelectedAuction(null)
  }

  const handleVehicleAdded = () => {
    loadAuctions() // Refresh the list
    setShowAddVehicleModal(false)
    setSelectedAuction(null)
  }

  // Dynamic cell components
  const LocationCell = ({ auction }: { auction: Auction }) => {
    const rowData = auctionRowData[auction.id]
    
    if (rowData?.locationLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-gray-500">Loading...</span>
        </div>
      )
    }
    
    if (rowData?.locationError) {
      return (
        <div className="text-red-600" title={`Error: ${rowData.locationError}`}>
          TBD
        </div>
      )
    }
    
    if (rowData?.location) {
      const { name, city } = rowData.location
      return (
        <div className="text-sm text-gray-900" title={`Source: api/location/${auction.locationId}`}>
          {city ? `${name} - ${city}` : name}
        </div>
      )
    }
    
    return <div className="text-gray-500">TBD</div>
  }

  const VehiclesCell = ({ auction }: { auction: Auction }) => {
    const rowData = auctionRowData[auction.id]
    
    if (rowData?.vehiclesLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-gray-500">Loading...</span>
        </div>
      )
    }
    
    if (rowData?.vehiclesError) {
      return (
        <div className="text-red-600" title={`Error: ${rowData.vehiclesError}`}>
          N/A
        </div>
      )
    }
    
    if (rowData?.vehiclesCount !== undefined) {
      return (
        <div className="text-sm text-gray-900" title={`Source: api/auctioncar/auction/${auction.id}`}>
          {rowData.vehiclesCount}
        </div>
      )
    }
    
    return <div className="text-gray-500">N/A</div>
  }

  const RevenueCell = ({ auction }: { auction: Auction }) => {
    const rowData = auctionRowData[auction.id]
    
    if (rowData?.revenueLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-gray-500">Loading...</span>
        </div>
      )
    }
    
    if (rowData?.revenueError) {
      return (
        <div className="text-red-600" title={`Error: ${rowData.revenueError}`}>
          N/A
        </div>
      )
    }
    
    if (rowData?.revenue !== undefined) {
      return (
        <div className="text-sm font-medium text-blue-600" title={`Source: api/auctioncar/{carId}/stats`}>
          ${rowData.revenue.toLocaleString()}
        </div>
      )
    }
    
    return <div className="text-gray-500">N/A</div>
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Auctions</h1>
            <p className="text-red-600">Error: {error}</p>
          </div>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Auctions</h1>
          <p className="text-gray-600">Manage and monitor all auction activities</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
          <button 
            onClick={() => setShowDebugPanel(true)}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Bug className="w-4 h-4" />
            Debug
          </button>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Auction
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <div className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${auctions.length} auctions found`}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="Live">Live</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Live">Live</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select 
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Regions</option>
                <option value="Baku">Baku</option>
                <option value="Ganja">Ganja</option>
                <option value="Sumgayit">Sumgayit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input 
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input 
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading auctions...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500">No auctions found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or create a new auction</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Auction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auctions.map((auction) => (
                  <tr key={auction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{auction.name}</div>
                        <div className="text-sm text-gray-500">ID: {auction.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(auction.status, auction.isLive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(auction.startTimeUtc).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(auction.startTimeUtc).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <LocationCell auction={auction} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <VehiclesCell auction={auction} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RevenueCell auction={auction} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewAuction(auction)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditAuction(auction)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Auction"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleAddVehicle(auction)}
                          className="text-green-600 hover:text-green-900"
                          title="Add Vehicle"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAuction(auction)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Auction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewAuctionModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={handleAuctionCreated}
        onAuctionCreated={(auction) => {
          handleAuctionCreated()
          setSelectedAuction(auction)
          setShowAddVehicleModal(true)
        }}
      />

      <EditAuctionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedAuction(null)
        }}
        auctionId={selectedAuction?.id || null}
        onSuccess={handleAuctionUpdated}
      />

      <DeleteAuctionModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedAuction(null)
        }}
        auction={selectedAuction}
        onSuccess={handleAuctionDeleted}
      />

      <AuctionDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedAuction(null)
        }}
        auctionId={selectedAuction?.id || null}
        onAuctionUpdated={handleAuctionUpdated}
      />

      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => {
          setShowAddVehicleModal(false)
          setSelectedAuction(null)
        }}
        auctionId={selectedAuction?.id || ''}
        onSuccess={handleVehicleAdded}
      />

      <DebugPanel
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
        debugCalls={debugCalls}
      />

      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigUpdated={() => {
          // Refresh data when config is updated
          loadAuctions()
        }}
      />
    </div>
  )
}
