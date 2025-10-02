import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  MapPin, 
  RefreshCw, 
  ArrowLeft, 
  Clock, 
  Trophy, 
  Plus,
  Wifi,
  WifiOff
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { apiClient as adminApiClient } from '../admin/services/apiClient';
import { 
  AuctionGetDto, 
  AuctionCarDetailDto, 
  AuctionCarGetDto
} from '../types/api';
import { useBidHub } from '../hooks/useBidHub';
import { useToast } from '../components/ToastProvider';
import { AuctionOverview } from '../components/AuctionOverview';
import { VehicleCarousel } from '../components/VehicleCarousel';
import { LiveBiddingPanel } from '../components/LiveBiddingPanel';
import { BidHistory } from '../components/BidHistory';
import { AddVehicleModal } from '../components/AddVehicleModal';
import { BidHubDebugger } from '../components/BidHubDebugger';

const AuctionJoinPage: React.FC = () => {
  const navigate = useNavigate();
  const { auctionId } = useParams<{ auctionId: string }>();
  const { addToast } = useToast();

  // State management
  const [auction, setAuction] = useState<AuctionGetDto | null>(null);
  const [currentCar, setCurrentCar] = useState<AuctionCarDetailDto | null>(null);
  const [upcomingCars, setUpcomingCars] = useState<AuctionCarGetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isAuctionLive, setIsAuctionLive] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [bidStats, setBidStats] = useState({
    totalBids: 0,
    bidCount: 0,
    averageBid: 0,
    soldCount: 0,
    totalSalesAmount: 0
  });
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [currentUserId] = useState<string>('');

  // BidHub integration with stable references
  const bidHubConfig = {
    baseUrl: 'https://localhost:7249',
    token: localStorage.getItem('authToken') || localStorage.getItem('auth_token') || ''
  };

  const bidHubEvents = {
    onJoinedAuctionCar: (data: any) => {
      console.log('Joined auction car:', data);
      setBidStats(data.stats);
      setCurrentCar(prev => prev ? {
        ...prev,
        currentPrice: data.highestBid,
        bidCount: data.stats.bidCount,
        lastBidTime: data.lastBidTime
      } : null);
    },
    onNewLiveBid: (data: any) => {
      console.log('New live bid:', data);
      setBidHistory(prev => [data, ...prev]);
      if (currentCar?.id === data.auctionCarId) {
        setCurrentCar(prev => prev ? {
          ...prev,
          currentPrice: data.amount,
          bidCount: (prev.bidCount || 0) + 1,
          lastBidTime: data.placedAtUtc
        } : null);
      }
      addToast({
        type: 'success',
        title: 'New Live Bid',
        message: `${data.userName} bid $${data.amount.toLocaleString()}`
      });
    },
    onPreBidPlaced: (data: any) => {
      console.log('Pre-bid placed:', data);
      setBidHistory(prev => [data, ...prev]);
      addToast({
        type: 'info',
        title: 'Pre-Bid Placed',
        message: `${data.userName} placed a pre-bid of $${data.amount.toLocaleString()}`
      });
    },
    onHighestBidUpdated: (data: any) => {
      console.log('Highest bid updated:', data);
      if (currentCar?.id === data.auctionCarId) {
        setCurrentCar(prev => prev ? {
          ...prev,
          currentPrice: data.amount
        } : null);
      }
    },
    onAuctionTimerReset: (data: any) => {
      console.log('Auction timer reset:', data);
      if (currentCar?.id === data.auctionCarId) {
        setTimerSeconds(data.secondsRemaining);
      }
    },
    onBidStatsUpdated: (data: any) => {
      console.log('Bid stats updated:', data);
      if (currentCar?.id === data.auctionCarId) {
        setBidStats(data.stats);
      }
    },
    onBidValidationError: (data: any) => {
      console.log('Bid validation error:', data);
      addToast({
        type: 'error',
        title: 'Bid Validation Error',
        message: data.errors.join(', ')
      });
    },
    onBidError: (error: string) => {
      console.error('Bid error:', error);
      addToast({
        type: 'error',
        title: 'Bid Error',
        message: error
      });
    },
    onConnectionStateChanged: (isConnected: boolean, error?: string) => {
      console.log('BidHub connection state changed:', isConnected, error);
      if (!isConnected && error) {
        addToast({
          type: 'warning',
          title: 'Connection Lost',
          message: 'Lost connection to auction. Attempting to reconnect...'
        });
      }
    }
  };

  const { 
    connectionState, 
    connect, 
    disconnect, 
    testConnection,
    joinAuctionCar, 
    leaveAuctionCar,
    placeLiveBid,
    placePreBid,
    placeProxyBid,
    cancelProxyBid,
    getMyBids
  } = useBidHub(bidHubConfig, bidHubEvents);

  // Load auction data
  const loadAuction = useCallback(async () => {
    if (!auctionId) {
      setError('No auction ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Loading auction with ID:', auctionId);

      // Load specific auction by ID
      let selectedAuction: AuctionGetDto | null = null;
      
      try {
        // First try to get the auction from the regular API
        const allAuctions = await apiClient.getAuctions();
        selectedAuction = allAuctions.find(auction => auction.id === auctionId) || null;
        console.log('Found auction in regular API:', selectedAuction);
      } catch (error) {
        console.log('Regular API failed, trying admin API:', error);
      }

      // If not found in regular API, try admin API
      if (!selectedAuction) {
        try {
          const adminAuctions = await adminApiClient.getAuctions({ limit: 100 });
          selectedAuction = adminAuctions.find(auction => auction.id === auctionId) || null;
          console.log('Found auction in admin API:', selectedAuction);
        } catch (error) {
          console.log('Admin API failed:', error);
        }
      }

      if (selectedAuction) {
        console.log('Selected auction:', selectedAuction);
        setAuction(selectedAuction);
        setIsAuctionLive(selectedAuction.status === 'Live' || selectedAuction.isLive === true);

        // Load cars for this auction
        try {
          const cars = await apiClient.getAuctionCars(selectedAuction.id);
          console.log('Auction cars:', cars);
          
          if (cars && cars.length > 0) {
            // Set the first car as current
            const firstCar = cars[0];
            console.log('Setting first car as current:', firstCar);
            setCurrentCar(firstCar as AuctionCarDetailDto);
            
            // Set remaining cars as upcoming
            const remainingCars = cars.slice(1);
            setUpcomingCars(remainingCars);
            console.log('Upcoming cars:', remainingCars);
          } else {
            console.log('No cars found for auction');
            setCurrentCar(null);
            setUpcomingCars([]);
          }
        } catch (carError) {
          console.error('Failed to load auction cars:', carError);
          setError(`Failed to load auction cars: ${carError instanceof Error ? carError.message : 'Unknown error'}`);
        }

        // Set timer based on auction status
        if (selectedAuction.status === 'Live' || selectedAuction.isLive) {
          // For live auctions, calculate remaining time until end
          const endTime = new Date(selectedAuction.endTimeUtc);
          const now = new Date();
          const timeUntilEnd = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
          setTimerSeconds(timeUntilEnd);
        } else {
          // For scheduled auctions, calculate time until start
          const startTime = new Date(selectedAuction.startTimeUtc);
          const now = new Date();
          const timeUntilStart = Math.max(0, Math.floor((startTime.getTime() - now.getTime()) / 1000));
          setTimerSeconds(timeUntilStart);
        }
      } else {
        console.log('Auction not found with ID:', auctionId);
        setAuction(null);
        setCurrentCar(null);
        setUpcomingCars([]);
        setError(`Auction with ID ${auctionId} not found. Please check the auction ID and try again.`);
      }
    } catch (error) {
      console.error('Failed to load auction:', error);
      setError(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if the backend server is running on https://localhost:7249`);
      setAuction(null);
      setCurrentCar(null);
      setUpcomingCars([]);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  // Timer effect
  useEffect(() => {
    if (timerSeconds > 0) {
      const timer = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            // Timer reached zero, refresh auction data
            loadAuction();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timerSeconds, loadAuction]);

  // Event handlers
  const handleRefresh = useCallback(() => {
    loadAuction();
  }, [loadAuction]);

  const handleVehicleAdded = useCallback((vehicle: any) => {
    console.log('Vehicle added:', vehicle);
    addToast({
      type: 'success',
      title: 'Vehicle Added',
      message: 'Vehicle has been added to the auction successfully!'
    });
    // Refresh the auction data to show the new vehicle
    loadAuction();
  }, [addToast, loadAuction]);

  const handlePlaceLiveBid = useCallback(async (amount: number): Promise<boolean> => {
    if (!currentCar?.id) return false;
    
    const success = await placeLiveBid(currentCar.id, amount);
    if (success) {
      addToast({
        type: 'success',
        title: 'Bid Placed',
        message: `Live bid of $${amount.toLocaleString()} placed successfully!`
      });
    }
    return success;
  }, [currentCar?.id, placeLiveBid, addToast]);

  const handlePlacePreBid = useCallback(async (amount: number): Promise<boolean> => {
    if (!currentCar?.id) return false;
    
    const success = await placePreBid(currentCar.id, amount);
    if (success) {
      addToast({
        type: 'success',
        title: 'Pre-Bid Placed',
        message: `Pre-bid of $${amount.toLocaleString()} placed successfully!`
      });
    }
    return success;
  }, [currentCar?.id, placePreBid, addToast]);

  const handlePlaceProxyBid = useCallback(async (startAmount: number, maxAmount: number): Promise<boolean> => {
    if (!currentCar?.id) return false;
    
    const success = await placeProxyBid(currentCar.id, maxAmount, startAmount);
    if (success) {
      addToast({
        type: 'success',
        title: 'Proxy Bid Placed',
        message: `Proxy bid with max amount $${maxAmount.toLocaleString()} placed successfully!`
      });
    }
    return success;
  }, [currentCar?.id, placeProxyBid, addToast]);

  const handleCancelProxyBid = useCallback(async (): Promise<boolean> => {
    if (!currentCar?.id) return false;
    
    const success = await cancelProxyBid(currentCar.id);
    if (success) {
      addToast({
        type: 'info',
        title: 'Proxy Bid Cancelled',
        message: 'Proxy bid has been cancelled successfully!'
      });
    }
    return success;
  }, [currentCar?.id, cancelProxyBid, addToast]);

  const handleRefreshBidHistory = useCallback(async () => {
    if (!currentCar?.id) return;
    
    try {
      const bids = await getMyBids(currentCar.id);
      setBidHistory(bids);
    } catch (error) {
      console.error('Failed to refresh bid history:', error);
    }
  }, [currentCar?.id, getMyBids]);

  // Load data on mount
  useEffect(() => {
    if (auctionId) {
      loadAuction();
    }
  }, [auctionId, loadAuction]);

  // Connect to BidHub when auction and car are loaded - FIXED: Removed problematic dependencies
  useEffect(() => {
    const initializeConnection = async () => {
      if (auction?.id && currentCar?.id) {
        console.log('Initializing BidHub connection for auction:', auction.id, 'car:', currentCar.id);
        
        // Test backend connectivity first
        const isBackendReachable = await testConnection();
        if (!isBackendReachable) {
          setError('Cannot connect to backend server. Please check if the server is running on https://localhost:7249');
          return;
        }
        
        // Attempt to connect to BidHub
        try {
          await connect();
          
          // Join the specific auction car after successful connection
          setTimeout(async () => {
            await joinAuctionCar(currentCar.id);
          }, 1000);
        } catch (error) {
          console.error('Failed to connect to BidHub:', error);
          setError(`Failed to connect to auction: ${error}`);
        }
      }
    };

    initializeConnection();

    return () => {
      if (currentCar?.id) {
        leaveAuctionCar(currentCar.id);
      }
      disconnect();
    };
  }, [auction?.id, currentCar?.id]); // FIXED: Only depend on auction and car IDs

  // Show empty state if no auction found
  if (!loading && !auction && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8">
            <Clock className="h-16 w-16 text-white/60 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Auction Not Found</h2>
            <p className="text-white/80 mb-6">
              The auction you're looking for could not be found. Please check the auction ID and try again.
            </p>
            <button
              onClick={() => navigate('/todays-auctions')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Today's Auctions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Hərrac məlumatları yüklənir...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-lg p-8">
            <Trophy className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Xəta baş verdi</h2>
            <p className="text-white/80 mb-6">{error}</p>
            <div className="space-y-2 text-sm text-white/60">
              <p>• Make sure your backend server is running on https://localhost:7249</p>
              <p>• Check your internet connection</p>
              <p>• Try refreshing the page</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/todays-auctions')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Today's Auctions
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{auction?.name}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    isAuctionLive ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isAuctionLive ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`}></div>
                    {isAuctionLive ? 'Live' : 'Scheduled'}
                  </div>
                  {auction?.locationName && (
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin className="h-4 w-4" />
                      {auction.locationName}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-white/80">
                    {connectionState.isConnected ? (
                      <Wifi className="h-4 w-4 text-green-400" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-sm">
                      {connectionState.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                {timerSeconds > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-white/80">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-mono">
                      {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
                {error && (
                  <div className="mt-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-200 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Vehicle
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowDebugger(true)}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                Debug WS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Auction Overview */}
          <div className="lg:col-span-1">
            <AuctionOverview 
              auctionId={auction?.id || ''}
              auctionName={auction?.name || 'Unknown Auction'}
              startTimeUtc={auction?.startTimeUtc}
              endTimeUtc={auction?.endTimeUtc}
              locationId={auction?.locationId}
              currency={'USD'}
              isLive={isAuctionLive}
              stats={{
                totalVehicles: upcomingCars.length + (currentCar ? 1 : 0),
                totalRevenue: 0,
                vehiclesSold: 0,
                successRate: 0,
                averagePrice: 0,
                totalBids: bidStats.totalBids
              }}
              onRefresh={handleRefresh}
              isRefreshing={loading}
            />
          </div>

          {/* Center Column - Current Vehicle */}
          <div className="lg:col-span-2">
            {currentCar ? (
              <div className="space-y-6">
                <VehicleCarousel 
                  carId={currentCar.id}
                  photos={[]}
                  autoPlay={true}
                  showThumbnails={true}
                  showControls={true}
                />
                <LiveBiddingPanel
                  auctionCarId={currentCar.id}
                  currentPrice={currentCar.currentPrice || 0}
                  reservePrice={currentCar.reservePrice}
                  minimumBid={100}
                  suggestedAmount={0}
                  bidCount={bidStats.bidCount}
                  isActive={isAuctionLive}
                  isReserveMet={currentCar.isReserveMet || false}
                  lastBidTime={currentCar.lastBidTime}
                  stats={bidStats}
                  onPlaceLiveBid={handlePlaceLiveBid}
                  onPlacePreBid={handlePlacePreBid}
                  onPlaceProxyBid={handlePlaceProxyBid}
                  onCancelProxyBid={handleCancelProxyBid}
                  isConnected={connectionState.isConnected}
                />
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center">
                <Trophy className="h-16 w-16 text-white/60 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Vehicle Available</h3>
                <p className="text-white/80">No vehicles are currently available for this auction.</p>
              </div>
            )}
          </div>

          {/* Right Column - Upcoming Vehicles & Bid History */}
          <div className="lg:col-span-1 space-y-6">
            {upcomingCars.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Upcoming Vehicles</h3>
                <div className="space-y-3">
                  {upcomingCars.map((car) => (
                    <div
                      key={car.id}
                      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 cursor-pointer hover:bg-white/20 transition-colors"
                      onClick={() => setCurrentCar(car as AuctionCarDetailDto)}
                    >
                      <h4 className="font-medium text-white">Lot #{car.lotNumber}</h4>
                      <p className="text-sm text-white/80">Vehicle #{car.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <BidHistory 
              auctionCarId={currentCar?.id || ''}
              bids={bidHistory}
              onRefresh={handleRefreshBidHistory}
              isRefreshing={loading}
              isConnected={connectionState.isConnected}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        auctionId={auction?.id || ''}
        onSuccess={() => handleVehicleAdded({})}
      />

      {/* BidHub Debugger */}
      {showDebugger && (
        <BidHubDebugger onClose={() => setShowDebugger(false)} />
      )}
    </div>
  );
};

export default AuctionJoinPage;