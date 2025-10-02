import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { 
  Calendar, 
  DollarSign, 
  Users,
  Car, 
  ChevronLeft,
  ChevronRight,
  Play,
  AlertCircle,
  Image as ImageIcon,
  X
} from 'lucide-react';

// Types
interface CarDetailDto {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  odometer: number;
  estRetailValue: number;
  photoUrls: string[];
  condition: number;
  conditionText?: string;
  color: string;
  engine: string;
  transmission: number;
  transmissionText?: string;
  driveTrain: number;
  driveTrainText?: string;
  titleType: number;
  titleTypeText?: string;
  damageType: number;
  damageTypeText?: string;
  locationId: string;
  description?: string;
}

interface LocationDto {
  id: string;
  name: string;
  city: string;
  region: string;
  postalCode: string;
}

interface AuctionDto {
  id: string;
  name: string;
  status: number;
  statusText?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  minBidIncrement: number;
}

interface AuctionCarDto {
  id: string;
  auctionId: string;
  carId: string;
  lotNumber: string;
  currentPrice: number;
  startingPrice: number;
  reservePrice: number;
}

interface BidDto {
  id: string;
  amount: number;
  userId: string;
  userName?: string;
  createdAt: string;
  type: string;
  status: string;
}

interface BidResponse {
  success: boolean;
  data: BidDto[];
}


const CarDetail: React.FC = () => {
  const { carId } = useParams<{ carId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { user } = useAuth();
  
  // Check if user came from watchlist to place a bid
  const isBidIntent = searchParams.get('bid') === 'true';
  
  // Ref for bid input auto-focus
  const bidInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [carDetails, setCarDetails] = useState<CarDetailDto | null>(null);
  const [location, setLocation] = useState<LocationDto | null>(null);
  const [auctionDetails, setAuctionDetails] = useState<AuctionDto | null>(null);
  const [auctionCar, setAuctionCar] = useState<AuctionCarDto | null>(null);
  const [bids, setBids] = useState<BidDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [showBidMessage, setShowBidMessage] = useState(isBidIntent);
  
  // Cache to prevent duplicate requests
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load car details
  const loadCarDetails = async () => {
    if (!carId || dataLoaded || !mounted) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('CarDetail: fetching car', carId);

      // Load car details
      const car = await apiClient.getCar(carId);
      console.log('CarDetail: car loaded', car);
      if (!mounted) return;
      setCarDetails(car);

      // Load car photos (try dedicated endpoint first, fallback to carDto.photoUrls)
      try {
        const photos = await apiClient.getCarPhotos(carId);
        console.log('CarDetail: photos loaded from endpoint', photos);
        if (photos && photos.length > 0 && mounted) {
          setCarDetails(prev => prev ? { ...prev, photoUrls: photos } : null);
        }
      } catch (photosError) {
        console.warn('CarDetail: photos endpoint failed, using carDto.photoUrls', photosError);
        if (photosError instanceof Error && photosError.message.includes('404')) {
          console.warn(`Car photos 404 for carId: ${carId}`);
        }
      }

      // Load location details
      if (car.locationId && mounted) {
        try {
          const locationData = await apiClient.getLocation(car.locationId);
          console.log('CarDetail: location loaded', locationData);
          if (mounted) setLocation(locationData);
        } catch (locationError) {
          console.warn('CarDetail: location failed', locationError);
          if (mounted) setLocation(null);
        }
      }

      // Find auction data
      await findAuctionData(carId);
      
      if (mounted) setDataLoaded(true);
    } catch (error) {
      console.error('CarDetail: failed to load car details', error);
      if (mounted) {
        setError('Failed to load car details. Please try again later.');
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load car details. Please try again later.'
        });
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  // Find auction data for this car
  const findAuctionData = async (carId: string) => {
    if (!mounted) return;
    
    try {
      console.log('CarDetail: searching for auction data');
      
      // Try preferred endpoint first: GET /api/AuctionCar/car/{carId}
      try {
        const auctionCarData = await apiClient.getAuctionCarByLot(carId);
        console.log('CarDetail: found auctionCar via direct lookup', auctionCarData);
        
        if (mounted) {
          // Transform AuctionCarDetailDto to AuctionCarDto
          const auctionCarDto: AuctionCarDto = {
            id: auctionCarData.id,
            auctionId: auctionCarData.auctionId,
            carId: auctionCarData.carId,
            lotNumber: auctionCarData.lotNumber || '',
            currentPrice: auctionCarData.currentPrice,
            startingPrice: auctionCarData.minPreBid || 0,
            reservePrice: auctionCarData.reservePrice || 0
          };
          setAuctionCar(auctionCarDto);
          
          // Load auction details
          const auction = await apiClient.getAuction(auctionCarData.auctionId);
          console.log('CarDetail: auction loaded', auction);
          if (mounted) {
            // Transform AuctionDetailDto to AuctionDto
            const auctionDto: AuctionDto = {
              id: auction.id,
              name: auction.name || 'Unknown Auction',
              status: auction.status === 'Live' ? 2 : auction.status === 'Scheduled' ? 1 : auction.status === 'Completed' ? 3 : 0,
              statusText: auction.status,
              startTimeUtc: auction.startTimeUtc,
              endTimeUtc: auction.endTimeUtc,
              minBidIncrement: auction.minBidIncrement
            };
            setAuctionDetails(auctionDto);
          }
          
          // Load bid data
          await loadBidData(auctionCarData.id);
        }
        return;
      } catch (directLookupError) {
        console.warn('CarDetail: direct auctionCar lookup failed (endpoint not available), trying fallback', directLookupError);
      }
      
      // Fallback: Get all auctions and search
      const auctions = await apiClient.getAuctions({ limit: 100 });
      console.log('CarDetail: auctions loaded', auctions.length);

      // Search through auctions to find the one containing this car
      for (const auction of auctions) {
        if (!mounted) break;
        
        try {
          const auctionCars = await apiClient.getAuctionCars(auction.id);
          console.log(`CarDetail: checking auction ${auction.id}, cars: ${auctionCars.length}`);
          
          const foundAuctionCar = auctionCars.find(ac => ac.carId === carId);
          if (foundAuctionCar) {
            console.log('CarDetail: found auctionCar', foundAuctionCar);
            if (mounted) {
              // Transform AuctionGetDto to AuctionDto
              const auctionDto: AuctionDto = {
                id: auction.id,
                name: auction.name || 'Unknown Auction',
                status: auction.status === 'Live' ? 2 : auction.status === 'Scheduled' ? 1 : auction.status === 'Completed' ? 3 : 0,
                statusText: auction.status,
                startTimeUtc: auction.startTimeUtc,
                endTimeUtc: auction.endTimeUtc,
                minBidIncrement: 100 // Default value since it's not in AuctionGetDto
              };
              setAuctionDetails(auctionDto);
              
              // Transform AuctionCarGetDto to AuctionCarDto
              const auctionCarDto: AuctionCarDto = {
                id: foundAuctionCar.id,
                auctionId: foundAuctionCar.auctionId,
                carId: foundAuctionCar.carId,
                lotNumber: foundAuctionCar.lotNumber || '',
                currentPrice: foundAuctionCar.currentPrice,
                startingPrice: foundAuctionCar.minPreBid || 0,
                reservePrice: foundAuctionCar.reservePrice || 0
              };
              setAuctionCar(auctionCarDto);
              
              // Load bid data
              await loadBidData(foundAuctionCar.id);
            }
            break;
          }
        } catch (error) {
          console.warn(`CarDetail: failed to load cars for auction ${auction.id}`, error);
        }
      }
      
      console.log('CarDetail: finished searching for auction data');
    } catch (error) {
      console.warn('CarDetail: failed to load auctions', error);
    }
  };

  // Load bid data
  const loadBidData = async (auctionCarId: string) => {
    if (!mounted) return;
    
    try {
      console.log('CarDetail: loading bid data for auctionCar', auctionCarId);
      
      // Load recent bids
      const token = user?.token || localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      if (!token) {
        console.warn('CarDetail: no auth token available for bid data');
        if (mounted) setBids([]);
        return;
      }
      
      const response = await fetch(`https://localhost:7249/api/Bid/auction-car/${auctionCarId}/recent?count=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const bidResponse: BidResponse = await response.json();
        console.log('CarDetail: bids loaded', bidResponse.data.length);
        if (mounted) setBids(bidResponse.data || []);
      } else {
        console.warn('CarDetail: failed to load bids', response.status);
        if (mounted) setBids([]);
      }
    } catch (error) {
      console.warn('CarDetail: failed to load bid data', error);
      if (mounted) setBids([]);
    }
  };

  // Handle bid placement
  const handlePlaceBid = async () => {
    if (!auctionCar || !bidAmount || bidAmount <= 0) return;
    
    try {
      setIsPlacingBid(true);
      
      const token = user?.token || localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Determine endpoint based on auction status
      let endpoint = '/api/Bid/live'; // Default to live bid
      let bidType = 'live';
      
      if (auctionDetails) {
        const auctionStatus = getStatusText(auctionDetails.status, auctionDetails.statusText);
        console.log('CarDetail: auction status:', auctionStatus);
        
        if (auctionStatus.toLowerCase() === 'running' || auctionStatus.toLowerCase() === 'live') {
          endpoint = '/api/Bid/live';
          bidType = 'live';
        } else {
          endpoint = '/api/Bid/prebid';
          bidType = 'prebid';
        }
      }
      
      const bidData = {
        auctionCarId: auctionCar.id,
        amount: bidAmount,
        notes: '' // Optional field
      };

      console.log('CarDetail: placing bid', {
        endpoint,
        bidType,
        bidData,
        auctionStatus: auctionDetails ? getStatusText(auctionDetails.status, auctionDetails.statusText) : 'Unknown'
      });
      
      const response = await fetch(`https://localhost:7249${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bidData)
      });

      console.log('CarDetail: bid response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('CarDetail: bid failed', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Bid failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('CarDetail: bid placed successfully', result);

      addToast({
        type: 'success',
        title: 'Bid Placed',
        message: `${bidType === 'live' ? 'Live' : 'Pre'} bid placed successfully!`
      });
      
      setBidAmount(0);
      
      // Refresh bids
      await loadBidData(auctionCar.id);
      
    } catch (error) {
      console.error('CarDetail: bid placement failed', error);
      addToast({
        type: 'error',
        title: 'Bid Failed',
        message: error instanceof Error ? error.message : 'Failed to place bid'
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatOdometer = (odometer: number) => {
    return odometer?.toLocaleString() || 'N/A';
  };

  const formatVIN = (vin: string) => {
    if (vin.length > 7) {
      return `${vin.substring(0, 3)}...${vin.substring(vin.length - 4)}`;
    }
    return vin;
  };

  const getConditionText = (condition: number, conditionText?: string) => {
    if (conditionText) return conditionText;
    
    const conditionMap: { [key: number]: string } = {
      0: 'Unknown',
      1: 'Run and Drive',
      2: 'Start and Drive',
      3: 'Non-Running',
      4: 'Parts Only'
    };
    
    return conditionMap[condition] || 'Unknown';
  };

  const getStatusText = (status: number, statusText?: string) => {
    if (statusText) return statusText;
    
    const statusMap: { [key: number]: string } = {
      0: 'Draft',
      1: 'Scheduled',
      2: 'Live',
      3: 'Completed',
      4: 'Cancelled'
    };
    
    return statusMap[status] || 'Unknown';
  };

  const getMinimumBid = () => {
    if (!auctionCar || !auctionDetails) return 0;
    
    if (auctionCar.currentPrice && auctionCar.currentPrice > 0) {
      return auctionCar.currentPrice + auctionDetails.minBidIncrement;
    }
    
    return auctionCar.startingPrice || auctionDetails.minBidIncrement;
  };

  const getBidStatus = () => {
    if (!bids || bids.length === 0) return null;
    
    const lastBid = bids[0];
    const currentUserId = user?.user?.id;
    
    if (lastBid.userId === currentUserId) {
      return 'Your Bid';
    }
    
    return lastBid.status || 'Placed';
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('/')) {
      return `https://localhost:7249${url}`;
    }
    return url;
  };

  // Photo navigation
  const nextPhoto = () => {
    if (carDetails?.photoUrls && carDetails.photoUrls.length > 0) {
      setCurrentPhotoIndex((prev) => 
        prev === carDetails.photoUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevPhoto = () => {
    if (carDetails?.photoUrls && carDetails.photoUrls.length > 0) {
      setCurrentPhotoIndex((prev) => 
        prev === 0 ? carDetails.photoUrls.length - 1 : prev - 1
      );
    }
  };

  // Effects
  useEffect(() => {
    setMounted(true);
    loadCarDetails();
    
    return () => {
      setMounted(false);
    };
  }, [carId]);

  // Auto-focus bid input when coming from watchlist
  useEffect(() => {
    if (isBidIntent && bidInputRef.current && !loading) {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        bidInputRef.current?.focus();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isBidIntent, loading]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading car details...</p>
                  </div>
                </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-4">Error Loading Car Details</p>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No car details
  if (!carDetails) {
  return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-white/40 mx-auto mb-4" />
          <p className="text-white text-lg mb-4">Car Not Found</p>
          <p className="text-white/60 mb-6">The requested car could not be found.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const minBid = getMinimumBid();
  const bidStatus = getBidStatus();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {carDetails.make} {carDetails.model} ({carDetails.year})
                </h1>
                <p className="text-white/60">
                  VIN: {formatVIN(carDetails.vin)}
                </p>
                <p className="text-white/60">
                  {location ? `${location.city} - ${location.name}` : 'Location TBD'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Vehicle Photos (30%) */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Photos
              </h2>
              
              {carDetails.photoUrls && carDetails.photoUrls.length > 0 ? (
                <div className="space-y-4">
                  {/* Main Photo */}
                  <div className="relative">
                    <div className="aspect-[4/3] bg-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={getImageUrl(carDetails.photoUrls[currentPhotoIndex])}
                        alt={`${carDetails.year} ${carDetails.make} ${carDetails.model}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-white/40" />
                      </div>
              </div>

                    {/* Navigation Arrows */}
                    {carDetails.photoUrls.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Thumbnail Slider */}
                  {carDetails.photoUrls.length > 1 && (
                    <div className="flex space-x-2 overflow-x-auto">
                      {carDetails.photoUrls.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden ${
                            index === currentPhotoIndex ? 'ring-2 ring-blue-500' : ''
                          }`}
                        >
                          <img
                            src={getImageUrl(url)}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-full h-full flex items-center justify-center bg-gray-700">
                            <ImageIcon className="h-4 w-4 text-white/40" />
                          </div>
                        </button>
                      ))}
                </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">No photos available</p>
                </div>
                  )}
                </div>
              </div>

          {/* Middle Column - Vehicle Details (40%) */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Details
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm">Odometer</p>
                    <p className="text-white font-medium">{formatOdometer(carDetails.odometer)} miles</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Est. Retail Value</p>
                    <p className="text-white font-medium">{formatCurrency(carDetails.estRetailValue)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm">Condition</p>
                    <p className="text-white font-medium">{getConditionText(carDetails.condition, carDetails.conditionText)}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Color</p>
                    <p className="text-white font-medium">{carDetails.color || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm">Engine</p>
                    <p className="text-white font-medium">{carDetails.engine || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Transmission</p>
                    <p className="text-white font-medium">{carDetails.transmissionText || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm">Drive Train</p>
                    <p className="text-white font-medium">{carDetails.driveTrainText || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Title Type</p>
                    <p className="text-white font-medium">{carDetails.titleTypeText || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/60 text-sm">Damage Type</p>
                    <p className="text-white font-medium">{carDetails.damageTypeText || 'N/A'}</p>
              </div>
            </div>

                {carDetails.description && (
                  <div>
                    <p className="text-white/60 text-sm mb-2">Description</p>
                    <p className="text-white">{carDetails.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Auction & Bid Info (30%) */}
          <div className="lg:col-span-1">
            {auctionCar ? (
          <div className="space-y-6">
                {/* Auction Information */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Auction Information
              </h2>

                  <div className="space-y-3">
                    <div>
                      <p className="text-white/60 text-sm">Auction</p>
                      <p className="text-white font-medium">{auctionDetails?.name || 'N/A'}</p>
              </div>

                    <div>
                      <p className="text-white/60 text-sm">Status</p>
                      <p className="text-white font-medium">
                        {getStatusText(auctionDetails?.status || 0, auctionDetails?.statusText)}
                      </p>
                </div>
                    
                    <div>
                      <p className="text-white/60 text-sm">Lot Number</p>
                      <p className="text-white font-medium">{auctionCar.lotNumber}</p>
            </div>

                    {auctionDetails && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-white/60 text-sm">Start Time</p>
                          <p className="text-white font-medium text-sm">
                            {new Date(auctionDetails.startTimeUtc).toLocaleDateString()}
                          </p>
                  </div>
                        <div>
                          <p className="text-white/60 text-sm">End Time</p>
                          <p className="text-white font-medium text-sm">
                            {new Date(auctionDetails.endTimeUtc).toLocaleDateString()}
                          </p>
                  </div>
                  </div>
                )}
                  </div>
                </div>

                {/* Bid Information */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Bid Information
                  </h2>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-white/60 text-sm">User</p>
                      <p className="text-white font-medium">{user?.user?.firstName ? `${user.user.firstName} ${user.user.lastName}` : 'Unknown User'}</p>
            </div>
                    
                    <div>
                      <p className="text-white/60 text-sm">Bid Status</p>
                      <p className="text-white font-medium">{bidStatus || 'No bids'}</p>
        </div>

                    <div>
                      <p className="text-white/60 text-sm">Auction Status</p>
                      <p className="text-white font-medium">
                        {getStatusText(auctionDetails?.status || 0, auctionDetails?.statusText)}
                      </p>
              </div>

                    <div>
                      <p className="text-white/60 text-sm">Minimum Bid</p>
                      <p className="text-white font-semibold text-lg">{formatCurrency(minBid)}</p>
                    </div>
                  </div>
                </div>

                {/* Bid Message from Watchlist */}
                {showBidMessage && (
                  <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Play className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-blue-100 mb-1">
                          Bid Verin!
                        </h3>
                        <p className="text-blue-200 text-sm">
                          Bu aracın müzayedesinde teklif vermek için aşağıdaki alanı kullanın.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowBidMessage(false)}
                        className="text-blue-300 hover:text-blue-100 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Place Bid */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Place Bid
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/60 text-sm mb-2">
                        Bid Amount
                  </label>
                      <input
                        ref={bidInputRef}
                        type="number"
                        value={bidAmount || ''}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        placeholder={formatCurrency(minBid)}
                        min={minBid}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <button
                      onClick={handlePlaceBid}
                      disabled={isPlacingBid || !bidAmount || bidAmount < minBid}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {isPlacingBid ? 'Placing Bid...' : 
                        auctionDetails ? 
                          (getStatusText(auctionDetails.status, auctionDetails.statusText).toLowerCase() === 'running' || 
                           getStatusText(auctionDetails.status, auctionDetails.statusText).toLowerCase() === 'live') ? 
                            'Place Live Bid' : 'Place Pre-Bid' : 
                        'Place Bid'}
                    </button>
                  </div>
                </div>

                {/* Bid History (Mini) */}
                {bids.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Recent Bids ({bids.length})
                    </h2>
                    
                    <div className="space-y-2">
                      {bids.slice(0, 3).map((bid) => (
                        <div key={bid.id} className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                          <div>
                            <div className="text-white font-medium">{formatCurrency(bid.amount)}</div>
                            <div className="text-white/60 text-sm">{bid.userName || 'Anonymous'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-white/60 text-sm">{formatDate(bid.createdAt)}</div>
                          </div>
                        </div>
                      ))}
                      
                      {bids.length > 3 && (
                        <div className="text-center pt-2">
                          <button className="text-blue-400 hover:text-blue-300 text-sm">
                            View all {bids.length} bids
                          </button>
                        </div>
                      )}
                  </div>
                  </div>
                )}
                </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">This car is not currently in any auction</p>
                </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetail;