import { useState, useEffect } from 'react'
import { X, Plus, Search, Car, DollarSign, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface AddVehicleModalProps {
  isOpen: boolean
  onClose: () => void
  auctionId: string
  onSuccess: () => void
}

interface AvailableCar {
  id: string
  vin: string
  make: string
  model: string
  year: number
  imageUrl?: string
  mileage?: number
  condition?: string
  location?: string
  thumbnailUrl?: string
  thumbnailLoading?: boolean
  thumbnailError?: boolean
}

interface CarDetail {
  id: string
  estimatedRetailValue?: number
  estimatedRetail?: number
  estimatedRetailPrice?: number
}

interface SelectedCar {
  carId: string
  lotNumber: string
  startingPrice: number
  reservePrice: number
  minPreBid: number
  estimatedRetailValue?: number
  carDetailLoading: boolean
  startingPriceEditable: boolean
  errors?: {
    lotNumber?: string
    startingPrice?: string
    reservePrice?: string
    minPreBid?: string
  }
}

export function AddVehicleModal({ isOpen, onClose, auctionId, onSuccess }: AddVehicleModalProps) {
  const [availableCars, setAvailableCars] = useState<AvailableCar[]>([])
  const [selectedCars, setSelectedCars] = useState<Map<string, SelectedCar>>(new Map())
  const [loading, setLoading] = useState(false)
  const [loadingCars, setLoadingCars] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [, setExistingCarsCount] = useState(0)
  const [usedLotNumbers, setUsedLotNumbers] = useState<Set<string>>(new Set())
  const [assignedCarIds, setAssignedCarIds] = useState<Set<string>>(new Set())
  
  // Thumbnail management
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map())
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set())
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      // Load assigned car IDs first, then load available cars
      loadAssignedCarIds().then(() => {
        loadExistingCarsCount()
      })
    } else {
      // Clear thumbnail cache when modal closes
      setThumbnailCache(new Map())
      setLoadingThumbnails(new Set())
      setFailedThumbnails(new Set())
      setUsedLotNumbers(new Set()) // Clear used lot numbers
      setAssignedCarIds(new Set()) // Clear assigned car IDs
    }
  }, [isOpen, auctionId])

  // Load available cars when assigned car IDs are loaded
  useEffect(() => {
    if (isOpen && assignedCarIds.size >= 0) { // >= 0 to trigger even when empty
      loadAvailableCars()
    }
  }, [isOpen, assignedCarIds])

  // Lazy load thumbnails for visible cars
  useEffect(() => {
    if (!isOpen || availableCars.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const carId = entry.target.getAttribute('data-car-id')
            if (carId && !loadingThumbnails.has(carId) && !thumbnailCache.has(carId) && !failedThumbnails.has(carId)) {
              loadCarThumbnail(carId)
            }
          }
        })
      },
      { threshold: 0.1 }
    )

    // Observe all car cards
    const carCards = document.querySelectorAll('[data-car-id]')
    carCards.forEach(card => observer.observe(card))

    return () => {
      observer.disconnect()
    }
  }, [isOpen, availableCars, loadingThumbnails, thumbnailCache, failedThumbnails])

  // Thumbnail utility functions
  const buildImageUrl = (url: string): string => {
    if (!url) return ''
    
    // If URL is already complete, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    // Get imageBaseURL from apiClient
    const imageBaseURL = (apiClient as any).imageBaseURL || ''
    
    // Remove leading slash from url if present to avoid double slashes
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url
    
    const fullUrl = imageBaseURL ? `${imageBaseURL}/${cleanUrl}` : cleanUrl
    return fullUrl
  }

  const extractThumbnailUrl = (carDetail: any): string | null => {
    try {
      // Priority 1: photos[0].thumbnailUrl or photos[0].url
      if (carDetail.photos && Array.isArray(carDetail.photos) && carDetail.photos.length > 0) {
        const firstPhoto = carDetail.photos[0]
        if (typeof firstPhoto === 'string') {
          return buildImageUrl(firstPhoto)
        } else if (firstPhoto && typeof firstPhoto === 'object') {
          return buildImageUrl(firstPhoto.thumbnailUrl || firstPhoto.url || firstPhoto.path || '')
        }
      }

      // Priority 2: images[0]
      if (carDetail.images && Array.isArray(carDetail.images) && carDetail.images.length > 0) {
        return buildImageUrl(carDetail.images[0])
      }

      // Priority 3: thumbnailUrl field
      if (carDetail.thumbnailUrl) {
        return buildImageUrl(carDetail.thumbnailUrl)
      }

      // Priority 4: files array (first image type)
      if (carDetail.files && Array.isArray(carDetail.files)) {
        const imageFile = carDetail.files.find((file: any) => 
          file.type === 'image' || file.mimeType?.startsWith('image/')
        )
        if (imageFile) {
          return buildImageUrl(imageFile.url || imageFile.path || imageFile.thumbnailUrl || '')
        }
      }

      // Priority 5: photoUrls (semicolon/comma separated)
      if (carDetail.photoUrls && typeof carDetail.photoUrls === 'string') {
        const urls = carDetail.photoUrls.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean)
        if (urls.length > 0) {
          return buildImageUrl(urls[0])
        }
      }

      return null
    } catch (error) {
      console.error('Error extracting thumbnail URL:', error)
      return null
    }
  }

  const roundToCurrency = (value: number): number => {
    return Math.round(value)
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  // Auto-fix lot number to 8 digits by padding with leading zeros
  const autoFixLotNumber = (lotNumber: string): string => {
    const trimmed = lotNumber.trim()
    
    // If it's already 8 digits, return as is
    if (/^\d{8}$/.test(trimmed)) {
      return trimmed
    }
    
    // If it's less than 8 digits and all digits, pad with leading zeros
    if (/^\d{1,7}$/.test(trimmed)) {
      return trimmed.padStart(8, '0')
    }
    
    // If it contains non-digits or is more than 8 digits, generate new one
    return generateUniqueLotNumber()
  }

  // Generate unique 8-digit lot number
  const generateUniqueLotNumber = (): string => {
    let lotNumber: string
    let attempts = 0
    const maxAttempts = 1000 // Prevent infinite loop
    
    do {
      // Generate random 8-digit number (always 8 digits)
      lotNumber = Math.floor(10000000 + Math.random() * 90000000).toString()
      attempts++
    } while (usedLotNumbers.has(lotNumber) && attempts < maxAttempts)
    
    if (attempts >= maxAttempts) {
      // Fallback: use timestamp-based number if random generation fails
      const timestamp = Date.now().toString()
      lotNumber = timestamp.slice(-8).padStart(8, '0')
    }
    
    // Ensure it's always exactly 8 digits
    lotNumber = lotNumber.padStart(8, '0')
    
    // Add to used numbers set
    setUsedLotNumbers(prev => new Set([...prev, lotNumber]))
    
    console.log(`Generated unique lot number: ${lotNumber}`)
    return lotNumber
  }

  // Load all assigned car IDs from all auctions
  const loadAssignedCarIds = async () => {
    try {
      console.log('Loading assigned car IDs from all auctions...')
      
      // Get all auction cars from all auctions
      const allAuctionCars = await apiClient.getAuctionCars({ limit: 1000 }) // Get large number to ensure we get all
      console.log('All auction cars response:', allAuctionCars)
      
      const assignedIds = new Set<string>()
      
      if (Array.isArray(allAuctionCars)) {
        allAuctionCars.forEach((auctionCar: any) => {
          if (auctionCar.carId) {
            assignedIds.add(auctionCar.carId)
          }
        })
      } else if ((allAuctionCars as any)?.items && Array.isArray((allAuctionCars as any).items)) {
        // Handle paginated response
        (allAuctionCars as any).items.forEach((auctionCar: any) => {
          if (auctionCar.carId) {
            assignedIds.add(auctionCar.carId)
          }
        })
      }
      
      setAssignedCarIds(assignedIds)
      console.log(`Found ${assignedIds.size} assigned car IDs:`, Array.from(assignedIds))
      
    } catch (err) {
      console.error('Error loading assigned car IDs:', err)
      setAssignedCarIds(new Set())
    }
  }

  const loadExistingCarsCount = async () => {
    try {
      const existingCars = await apiClient.getAuctionCarsByAuction(auctionId)
      setExistingCarsCount(existingCars?.length || 0)
      
      // Load existing lot numbers to ensure uniqueness
      const existingLotNumbers = new Set<string>()
      if (Array.isArray(existingCars)) {
        existingCars.forEach(car => {
          if (car.lotNumber) {
            // Auto-fix lot number to 8 digits
            const fixedLotNumber = autoFixLotNumber(car.lotNumber)
            existingLotNumbers.add(fixedLotNumber)
            
            // Log if lot number was fixed
            if (car.lotNumber !== fixedLotNumber) {
              console.log(`Auto-fixed lot number: ${car.lotNumber} → ${fixedLotNumber}`)
            }
          }
        })
      }
      setUsedLotNumbers(existingLotNumbers)
      
      console.log(`Loaded ${existingCars?.length || 0} existing cars with lot numbers:`, Array.from(existingLotNumbers))
    } catch (err) {
      console.error('Error loading existing cars count:', err)
      setExistingCarsCount(0)
      setUsedLotNumbers(new Set())
    }
  }

  const loadCarDetail = async (carId: string): Promise<CarDetail | null> => {
    try {
      const carDetail = await apiClient.getVehicleById(carId)
      return carDetail
    } catch (err) {
      console.error('Error loading car detail:', err)
      return null
    }
  }

  const calculateAutoPrices = (estimatedRetailValue: number) => {
    const startingAuto = roundToCurrency(estimatedRetailValue * 0.80)
    const reserveAuto = roundToCurrency(estimatedRetailValue * 0.90)
    return { startingAuto, reserveAuto }
  }

  const loadAvailableCars = async () => {
    setLoadingCars(true)
    setError(null)
    try {
      console.log('Loading available cars for auction:', auctionId)
      
      let allCars: any[] = []
      
      try {
        // First try to get all cars from the main endpoint
        console.log('Fetching cars from /api/Car endpoint...')
        const allCarsResponse = await apiClient.getVehicles({ pageSize: 100 })
        allCars = allCarsResponse.items || []
        console.log(`Total cars fetched from main endpoint: ${allCars.length}`)
      } catch (mainError) {
        console.warn('Main endpoint failed, trying fallback:', mainError)
        
        // Fallback: try direct API call
        try {
          const fallbackResponse = await (apiClient as any).request('/api/Car')
          if (Array.isArray(fallbackResponse)) {
            allCars = fallbackResponse
          } else if (fallbackResponse?.items && Array.isArray(fallbackResponse.items)) {
            allCars = fallbackResponse.items
          } else if (fallbackResponse?.data && Array.isArray(fallbackResponse.data)) {
            allCars = fallbackResponse.data
          }
          console.log(`Total cars fetched from fallback: ${allCars.length}`)
        } catch (fallbackError) {
          console.error('Fallback endpoint also failed:', fallbackError)
          throw new Error('Unable to load cars from any endpoint. Please check your connection and try again.')
        }
      }
      
      if (allCars.length === 0) {
        console.warn('No cars found from any endpoint')
        setError('No vehicles found in the system. Please contact support.')
        setAvailableCars([])
        return
      }
      
      // Filter out cars that are already assigned to any auction
      const availableCars = allCars.filter(car => !assignedCarIds.has(car.id))
      
      console.log(`Filtered cars: ${allCars.length} total → ${availableCars.length} available (${allCars.length - availableCars.length} already assigned)`)
      console.log('Available cars sample:', availableCars.slice(0, 3).map(car => ({ id: car.id, make: car.make, model: car.model })))
      
      setAvailableCars(availableCars)
      
      // Start loading thumbnails for visible cars (first 20) - only for cars with valid IDs
      // Note: Thumbnail loading is optional and won't affect car display
      if (availableCars && availableCars.length > 0) {
        const visibleCarIds = availableCars
          .slice(0, 20)
          .map(car => car.id)
          .filter(id => id && typeof id === 'string' && id.length > 0) // Filter out invalid IDs
        if (visibleCarIds.length > 0) {
          // Load thumbnails in background - don't await to avoid blocking car display
          loadThumbnailsBatch(visibleCarIds).catch(error => {
            console.warn('Thumbnail loading failed, but cars will still be displayed:', error)
          })
        }
      }
    } catch (err: any) {
      console.error('Error loading available cars:', err)
      setError(err.message || 'Failed to load available cars')
      setAvailableCars([]) // Ensure we set empty array on error
    } finally {
      setLoadingCars(false)
    }
  }

  // Thumbnail loading functions
  const loadCarThumbnail = async (carId: string): Promise<void> => {
    // Check if already loading, cached, or marked as failed
    if (loadingThumbnails.has(carId) || thumbnailCache.has(carId) || failedThumbnails.has(carId)) {
      return
    }

    // Double-check that car still exists in availableCars
    const carStillExists = availableCars.some(car => car.id === carId)
    if (!carStillExists) {
      console.log(`Skipping thumbnail load for car ${carId} - no longer in available cars`)
      return
    }

    // Mark as loading
    setLoadingThumbnails(prev => new Set(prev).add(carId))

    try {
      console.log(`Loading thumbnail for car ${carId}`)
      const carDetail = await apiClient.getVehicleById(carId)
      
      const thumbnailUrl = extractThumbnailUrl(carDetail)
      if (thumbnailUrl) {
        console.log(`Found thumbnail for car ${carId}:`, thumbnailUrl)
        setThumbnailCache(prev => new Map(prev).set(carId, thumbnailUrl))
        
        // Update the car in availableCars with thumbnail info
        setAvailableCars(prev => prev.map(car => 
          car.id === carId 
            ? { ...car, thumbnailUrl, thumbnailLoading: false, thumbnailError: false }
            : car
        ))
      } else {
        console.log(`No thumbnail found for car ${carId}`)
        setAvailableCars(prev => prev.map(car => 
          car.id === carId 
            ? { ...car, thumbnailLoading: false, thumbnailError: true }
            : car
        ))
      }
    } catch (error: any) {
      // Debug: Log the full error to understand the structure
      console.log(`Error details for car ${carId}:`, {
        message: error.message,
        status: error.status,
        name: error.name
      })
      
      // Check if it's a car not found error (various formats)
      const isCarNotFound = (error.message && (
        error.message.includes('404') || 
        error.message.includes('not found') ||
        error.message.includes('Car with ID') ||
        (error.message.includes('400') && error.message.includes('Bad Request')) ||
        error.message.includes('detail":"Car with ID')
      ))
      
      if (isCarNotFound) {
        console.warn(`Car ${carId} not found - removing from available cars`)
        // Mark as failed to prevent future attempts
        setFailedThumbnails(prev => new Set(prev).add(carId))
        // Remove the car from available cars since it doesn't exist
        setAvailableCars(prev => prev.filter(car => car.id !== carId))
      } else {
        console.error(`Failed to load thumbnail for car ${carId}:`, error)
        setAvailableCars(prev => prev.map(car => 
          car.id === carId 
            ? { ...car, thumbnailLoading: false, thumbnailError: true }
            : car
        ))
      }
    } finally {
      setLoadingThumbnails(prev => {
        const newSet = new Set(prev)
        newSet.delete(carId)
        return newSet
      })
    }
  }

  const loadThumbnailsBatch = async (carIds: string[]): Promise<void> => {
    // Filter out cars that are already cached, loading, or failed
    const validCarIds = carIds.filter(carId => 
      !loadingThumbnails.has(carId) && 
      !thumbnailCache.has(carId) && 
      !failedThumbnails.has(carId)
    )
    
    if (validCarIds.length === 0) return
    
    console.log(`Loading thumbnails for ${validCarIds.length} cars:`, validCarIds)
    
    // Process cars one by one to avoid race conditions
    for (const carId of validCarIds) {
      // Double-check that car still exists in availableCars before processing
      const carStillExists = availableCars.some(car => car.id === carId)
      if (!carStillExists) {
        console.log(`Skipping car ${carId} - no longer in available cars`)
        continue
      }
      
      // Check again if already processed
      if (loadingThumbnails.has(carId) || thumbnailCache.has(carId) || failedThumbnails.has(carId)) {
        console.log(`Skipping car ${carId} - already processed`)
        continue
      }
      
      try {
        await loadCarThumbnail(carId)
        // Small delay between requests to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`Error in batch loading for car ${carId}:`, error)
      }
    }
  }

  const handleCarSelect = async (car: AvailableCar) => {
    const carId = car.id
    const isSelected = selectedCars.has(carId)
    
    if (isSelected) {
      const newSelected = new Map(selectedCars)
      newSelected.delete(carId)
      setSelectedCars(newSelected)
    } else {
      // Generate unique 8-digit lot number
      const lotNumber = generateUniqueLotNumber()
      
      // Create initial car data
      const initialCarData: SelectedCar = {
        carId,
        lotNumber,
        startingPrice: 0,
        reservePrice: 0,
        minPreBid: 100,
        estimatedRetailValue: undefined,
        carDetailLoading: true,
        startingPriceEditable: true,
        errors: {}
      }
      
      const newSelected = new Map(selectedCars)
      newSelected.set(carId, initialCarData)
      setSelectedCars(newSelected)
      
      // Load car detail and calculate auto prices
      try {
        const carDetail = await loadCarDetail(carId)
        const estimatedRetailValue = carDetail?.estimatedRetailValue || carDetail?.estimatedRetail || carDetail?.estimatedRetailPrice
        
        if (estimatedRetailValue && estimatedRetailValue > 0) {
          const { startingAuto, reserveAuto } = calculateAutoPrices(estimatedRetailValue)
          
          // Update with auto-calculated prices
          const updatedCarData: SelectedCar = {
            ...initialCarData,
            startingPrice: startingAuto,
            reservePrice: reserveAuto,
            estimatedRetailValue,
            carDetailLoading: false,
            startingPriceEditable: false // Starting price is auto-calculated and read-only
          }
          
          newSelected.set(carId, updatedCarData)
          setSelectedCars(new Map(newSelected))
        } else {
          // No estimated retail value - keep starting price editable
          const updatedCarData: SelectedCar = {
            ...initialCarData,
            carDetailLoading: false,
            startingPriceEditable: true
          }
          
          newSelected.set(carId, updatedCarData)
          setSelectedCars(new Map(newSelected))
        }
      } catch (err) {
        console.error('Error loading car detail:', err)
        const updatedCarData: SelectedCar = {
          ...initialCarData,
          carDetailLoading: false,
          startingPriceEditable: true
        }
        
        newSelected.set(carId, updatedCarData)
        setSelectedCars(new Map(newSelected))
      }
    }
  }

  const refreshCarDetail = async (carId: string) => {
    const carData = selectedCars.get(carId)
    if (!carData) return
    
    // Update loading state
    const updatedCarData = { ...carData, carDetailLoading: true }
    const newSelected = new Map(selectedCars)
    newSelected.set(carId, updatedCarData)
    setSelectedCars(newSelected)
    
    try {
      const carDetail = await loadCarDetail(carId)
      const estimatedRetailValue = carDetail?.estimatedRetailValue || carDetail?.estimatedRetail || carDetail?.estimatedRetailPrice
      
      if (estimatedRetailValue && estimatedRetailValue > 0) {
        const { startingAuto, reserveAuto } = calculateAutoPrices(estimatedRetailValue)
        
        const refreshedCarData: SelectedCar = {
          ...carData,
          startingPrice: startingAuto,
          reservePrice: reserveAuto,
          estimatedRetailValue,
          carDetailLoading: false,
          startingPriceEditable: false
        }
        
        newSelected.set(carId, refreshedCarData)
        setSelectedCars(newSelected)
      } else {
        const refreshedCarData: SelectedCar = {
          ...carData,
          carDetailLoading: false,
          startingPriceEditable: true
        }
        
        newSelected.set(carId, refreshedCarData)
        setSelectedCars(newSelected)
      }
    } catch (err) {
      console.error('Error refreshing car detail:', err)
      const refreshedCarData: SelectedCar = {
        ...carData,
        carDetailLoading: false,
        startingPriceEditable: true
      }
      
      newSelected.set(carId, refreshedCarData)
      setSelectedCars(newSelected)
    }
  }
  const validateCarData = (carData: SelectedCar): SelectedCar => {
    const errors: any = {}
    
    // Lot number is auto-generated, no validation needed
    
    // Validate minPreBid
    if (carData.minPreBid < 1 || carData.minPreBid > 1000000) {
      errors.minPreBid = 'Min pre-bid must be between 1 and 1,000,000'
    }
    
    return { ...carData, errors }
  }

  // Regenerate lot number for a specific car
  const regenerateLotNumber = (carId: string) => {
    const newSelected = new Map(selectedCars)
    const carData = newSelected.get(carId)
    
    if (carData) {
      // Remove old lot number from used set
      setUsedLotNumbers(prev => {
        const newSet = new Set(prev)
        newSet.delete(carData.lotNumber)
        return newSet
      })
      
      // Generate new unique lot number
      const newLotNumber = generateUniqueLotNumber()
      
      const updatedCarData = { 
        ...carData, 
        lotNumber: newLotNumber,
        errors: carData.errors ? { ...carData.errors, lotNumber: undefined } : undefined
      }
      
      newSelected.set(carId, updatedCarData)
      setSelectedCars(newSelected)
      
      console.log(`Regenerated lot number for car ${carId}: ${newLotNumber}`)
    }
  }

  const handleCarDataChange = (carId: string, field: keyof SelectedCar, value: any) => {
    const newSelected = new Map(selectedCars)
    const carData = newSelected.get(carId)
    if (carData) {
      const updatedCarData = { ...carData, [field]: value }
      
      // Lot number is auto-generated, no manual validation needed
      
      const validatedCarData = validateCarData(updatedCarData)
      newSelected.set(carId, validatedCarData)
      setSelectedCars(newSelected)
    }
  }

  const handleSubmit = async () => {
    if (selectedCars.size === 0) {
      setError('Please select at least one vehicle')
      return
    }

    // Validate all selected cars
    let hasErrors = false
    const validatedCars = new Map<string, SelectedCar>()
    
    for (const [carId, carData] of selectedCars) {
      const validatedCar = validateCarData(carData)
      validatedCars.set(carId, validatedCar)
      
      if (Object.keys(validatedCar.errors || {}).length > 0) {
        hasErrors = true
      }
    }
    
    if (hasErrors) {
      setSelectedCars(validatedCars)
      setError('Please fix validation errors before submitting')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Validate auctionId first
      if (!auctionId || auctionId.trim() === '') {
        throw new Error('Auction ID is required to add vehicles')
      }

      // Try batch API first, fallback to individual calls
      const carsToAdd = Array.from(selectedCars.values()).map(carData => {
        // Validate each car's data
        if (!carData.carId || carData.carId.trim() === '') {
          throw new Error('Car ID is required for all selected vehicles')
        }
        if (!carData.lotNumber || carData.lotNumber.trim() === '') {
          throw new Error('Lot number is required for all selected vehicles')
        }
        if (!carData.startingPrice || carData.startingPrice <= 0) {
          throw new Error('Starting price must be greater than 0')
        }

        return {
          auctionId: auctionId.trim(),
          carId: carData.carId.trim(),
          lotNumber: carData.lotNumber.trim(),
          startingPrice: Number(carData.startingPrice),
          reservePrice: carData.reservePrice ? Number(carData.reservePrice) : null,
          minPreBid: carData.minPreBid ? Number(carData.minPreBid) : null
        }
      })

      console.log('Starting to add vehicles to auction:', {
        auctionId,
        carsCount: carsToAdd.length,
        carsData: carsToAdd
      })
      
      // Use individual calls since batch endpoint doesn't exist
      const promises = carsToAdd.map(async (carData, index) => {
        try {
          console.log(`Creating auction car ${index + 1}/${carsToAdd.length}:`, carData)
          
          // Additional validation before API call
          if (!carData.auctionId || !carData.carId || !carData.lotNumber) {
            throw new Error(`Missing required fields: auctionId=${carData.auctionId}, carId=${carData.carId}, lotNumber=${carData.lotNumber}`)
          }
          
          const result = await apiClient.createAuctionCar(carData)
          console.log(`Auction car ${index + 1} created successfully:`, result)
          return { success: true, data: result, index }
        } catch (error: any) {
          console.error(`Failed to create auction car ${index + 1}:`, error)
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            response: error.response
          })
          return { success: false, error, index, carData }
        }
      })
      
      const results = await Promise.all(promises)
      
      // Check if any failed
      const failures = results.filter(r => !r.success)
      if (failures.length > 0) {
        const errorMessages = failures.map(f => 
          `Car ${f.index + 1} (${f.carData?.lotNumber || 'Unknown'}): ${(f.error as any)?.message || 'Unknown error'}`
        ).join('\n')
        throw new Error(`Failed to add ${failures.length} vehicle(s):\n${errorMessages}`)
      }
      
      console.log('All vehicles added successfully!')
      onSuccess()
      onClose()
      setSelectedCars(new Map())
      setSearchTerm('')
    } catch (err: any) {
      console.error('Error adding vehicles to auction:', err)
      
      // Parse server error response
      let errorMessage = 'Failed to add vehicles to auction'
      
      if (err.message) {
        errorMessage = err.message
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const filteredCars = availableCars.filter(car => {
    const matchesSearch = !searchTerm || 
      car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.vin.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (showSelectedOnly) {
      return matchesSearch && selectedCars.has(car.id)
    }
    
    return matchesSearch
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Plus className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add Vehicles to Auction</h2>
              <p className="text-xs text-gray-600">Select vehicles and set auction details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-1.5 text-xs text-gray-600 mx-4 mb-2 rounded">
            <div className="flex flex-wrap gap-3">
              <span>Available: {availableCars.length}</span>
              <span>Assigned: {assignedCarIds.size}</span>
              <span>Selected: {selectedCars.size}</span>
              <span>Loading: {loadingCars ? 'Yes' : 'No'}</span>
              <span>Filtered: {filteredCars.length}</span>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by make, model, or VIN..."
              />
            </div>
            <button
              onClick={() => setShowSelectedOnly(!showSelectedOnly)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showSelectedOnly 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showSelectedOnly ? 'Show All' : 'Selected Only'}
            </button>
          </div>
          
          {/* Filtering Info */}
          {assignedCarIds.size > 0 && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <p className="text-xs text-blue-700">
                  Showing unassigned vehicles only. {assignedCarIds.size} already assigned.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {loadingCars ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading available vehicles...</p>
            </div>
          ) : filteredCars.length === 0 ? (
            <div className="text-center py-8">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No vehicles available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCars.map((car) => {
                const isSelected = selectedCars.has(car.id)
                const carData = selectedCars.get(car.id)
                  
                  return (
                  <div key={car.id} data-car-id={car.id} className={`border rounded-lg p-3 transition-colors ${
                    isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Car Image */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center relative overflow-hidden">
                          {car.thumbnailUrl ? (
                            <img 
                              src={car.thumbnailUrl} 
                              alt={`${car.year} ${car.make} ${car.model}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : car.thumbnailLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                          ) : car.thumbnailError ? (
                            <div className="flex items-center justify-center">
                              <Car className="w-8 h-8 text-gray-400" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Car className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Fallback for failed image load */}
                          <div className={`absolute inset-0 bg-gray-200 flex items-center justify-center ${car.thumbnailUrl ? 'hidden' : ''}`}>
                            <Car className="w-8 h-8 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      {/* Car Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {car.year} {car.make} {car.model}
                            </h3>
                            <p className="text-sm text-gray-600">VIN: {car.vin}</p>
                            {car.mileage && (
                              <p className="text-sm text-gray-600">Mileage: {car.mileage.toLocaleString()} miles</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleCarSelect(car)}
                            className={`p-2 rounded-lg transition-colors ${
                              isSelected 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Plus className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        
                        {/* Car Details Form */}
                        {isSelected && carData && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                            {/* Loading State */}
                            {carData.carDetailLoading && (
                              <div className="flex items-center gap-2 mb-4 text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm">Loading car details...</span>
                              </div>
                            )}
                            
                            {/* Price Information */}
                            {carData.estimatedRetailValue && carData.estimatedRetailValue > 0 && (
                              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-green-800">
                                      Estimated Retail: {formatCurrency(carData.estimatedRetailValue)}
                                    </p>
                                    <p className="text-xs text-green-600">
                                      Auto-calculated: Starting {formatCurrency(carData.startingPrice)} (80%), Reserve {formatCurrency(carData.reservePrice)} (90%)
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Starting price is locked (calculated from retail). Reserve price is editable.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => refreshCarDetail(car.id)}
                                    className="p-1 text-green-600 hover:text-green-800"
                                    title="Refresh car details"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Warning for no estimated retail */}
                            {!carData.estimatedRetailValue && !carData.carDetailLoading && (
                              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                  <p className="text-sm text-yellow-800">
                                    Estimated retail value not available — starting price must be entered manually.
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Lot Number (Auto-generated)
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={carData.lotNumber}
                                    readOnly
                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-700 cursor-not-allowed"
                                    placeholder="Auto-generated"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => regenerateLotNumber(car.id)}
                                    className="px-2 py-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                    title="Generate new unique lot number"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Lot number is automatically generated and unique
                                </p>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Starting Price *
                                </label>
                                <div className="relative">
                                  <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                  <input
                                    type="number"
                                    value={carData.startingPrice}
                                    onChange={(e) => handleCarDataChange(car.id, 'startingPrice', parseFloat(e.target.value) || 0)}
                                    disabled={!carData.startingPriceEditable}
                                    className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      carData.errors?.startingPrice ? 'border-red-300' : 'border-gray-200'
                                    } ${!carData.startingPriceEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                  />
                                  {!carData.startingPriceEditable && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">🔒</span>
                        </div>
                                    </div>
                                  )}
                                </div>
                                {carData.errors?.startingPrice && (
                                  <p className="text-xs text-red-600 mt-1">{carData.errors.startingPrice}</p>
                                )}
                                {!carData.startingPriceEditable && carData.estimatedRetailValue && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Calculated (80% of ${formatCurrency(carData.estimatedRetailValue)})
                                  </p>
                                )}
                      </div>
                      
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Reserve Price
                                </label>
                                <div className="relative">
                                  <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                  <input
                                    type="number"
                                    value={carData.reservePrice}
                                    onChange={(e) => handleCarDataChange(car.id, 'reservePrice', parseFloat(e.target.value) || 0)}
                                    className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      carData.errors?.reservePrice ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                                {carData.errors?.reservePrice && (
                                  <p className="text-xs text-red-600 mt-1">{carData.errors.reservePrice}</p>
                                )}
                                {carData.estimatedRetailValue && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Suggested (90% of ${formatCurrency(carData.estimatedRetailValue)}) — editable
                                  </p>
                                )}
                        </div>
                        
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Min Pre-Bid *
                                </label>
                                <div className="relative">
                                  <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                  <input
                                    type="number"
                                    value={carData.minPreBid}
                                    onChange={(e) => handleCarDataChange(car.id, 'minPreBid', parseInt(e.target.value) || 100)}
                                    className={`w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      carData.errors?.minPreBid ? 'border-red-300' : 'border-gray-200'
                                    }`}
                                    placeholder="100"
                                    min="1"
                                    max="1000000"
                                  />
                                </div>
                                {carData.errors?.minPreBid && (
                                  <p className="text-xs text-red-600 mt-1">{carData.errors.minPreBid}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedCars.size} vehicle{selectedCars.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-4 py-1.5 text-sm rounded transition-colors flex items-center gap-2 ${
                loading || selectedCars.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add {selectedCars.size} Vehicle{selectedCars.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}