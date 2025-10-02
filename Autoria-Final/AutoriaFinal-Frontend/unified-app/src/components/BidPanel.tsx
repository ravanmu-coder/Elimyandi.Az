import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Minus, Clock, Shield, Zap, Target, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { bidApi, CreateBidRequest } from '../api/bids';
import { useToast } from './ToastProvider';
import { apiClient } from '../lib/api';

interface BidPanelProps {
  auctionCarId: string;
  currentPrice: number;
  minBidIncrement: number;
  isActive: boolean;
  isReserveMet: boolean;
  reservePrice?: number;
  bidCount: number;
  lastBidTime?: string;
  onBidPlaced?: (bid: any) => void;
  className?: string;
}

export const BidPanel: React.FC<BidPanelProps> = ({
  auctionCarId,
  currentPrice,
  minBidIncrement,
  isActive,
  isReserveMet,
  reservePrice,
  bidCount,
  lastBidTime,
  onBidPlaced,
  className = ''
}) => {
  const [bidAmount, setBidAmount] = useState(currentPrice + minBidIncrement);
  const [bidType, setBidType] = useState<'live' | 'pre' | 'proxy'>('live');
  const [proxyMaxAmount, setProxyMaxAmount] = useState(currentPrice + minBidIncrement * 10);
  const [proxyIncrement, setProxyIncrement] = useState(minBidIncrement);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    setBidAmount(currentPrice + minBidIncrement);
  }, [currentPrice, minBidIncrement]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleBidAmountChange = (value: number) => {
    const newAmount = Math.max(currentPrice + minBidIncrement, value);
    setBidAmount(newAmount);
  };

  const incrementBid = () => {
    handleBidAmountChange(bidAmount + minBidIncrement);
  };

  const decrementBid = () => {
    handleBidAmountChange(bidAmount - minBidIncrement);
  };

  const handlePlaceBid = async () => {
    if (!isAuthenticated) {
      addToast({
        type: 'error',
        title: 'Login Required',
        message: 'Please log in to place a bid.'
      });
      return;
    }

    if (!isActive && bidType === 'live') {
      addToast({
        type: 'error',
        title: 'Auction Inactive',
        message: 'This auction is not currently active for live bidding.'
      });
      return;
    }

    if (bidAmount < currentPrice + minBidIncrement) {
      addToast({
        type: 'error',
        title: 'Invalid Bid Amount',
        message: `Bid must be at least ${formatPrice(currentPrice + minBidIncrement)}.`
      });
      return;
    }

    setIsPlacingBid(true);
    try {
      let response;
      
      switch (bidType) {
        case 'pre':
          response = await apiClient.placePreBid({
            auctionCarId,
            amount: bidAmount
          });
          break;
        case 'live':
          response = await apiClient.placeLiveBid({
            auctionCarId,
            amount: bidAmount
          });
          break;
        case 'proxy':
          response = await apiClient.placeProxyBid({
            auctionCarId,
            maxAmount: proxyMaxAmount,
            incrementAmount: proxyIncrement
          });
          break;
        default:
          throw new Error('Invalid bid type');
      }
      
      addToast({
        type: 'success',
        title: 'Bid Placed Successfully',
        message: `You are now the highest bidder!`
      });
      
      onBidPlaced?.(response);
      
      // Reset form
      setBidAmount(currentPrice + minBidIncrement);
      setProxyMaxAmount(currentPrice + minBidIncrement * 10);
      
    } catch (error) {
      console.error('Failed to place bid:', error);
      addToast({
        type: 'error',
        title: 'Bid Failed',
        message: error instanceof Error ? error.message : 'Failed to place bid. Please try again.'
      });
    } finally {
      setIsPlacingBid(false);
    }
  };

  const isBidDisabled = !isAuthenticated || !isActive || isPlacingBid;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="space-y-6">
        {/* Current Price */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Current Price</p>
          <p className="text-3xl font-bold text-gray-900">{formatPrice(currentPrice)}</p>
          {bidCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {bidCount} bid{bidCount !== 1 ? 's' : ''}
              {lastBidTime && ` • Last bid at ${formatTime(lastBidTime)}`}
            </p>
          )}
        </div>

        {/* Reserve Status */}
        {reservePrice && (
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            <span className={`text-sm font-medium ${
              isReserveMet ? 'text-green-600' : 'text-orange-600'
            }`}>
              Reserve {isReserveMet ? 'Met' : 'Not Met'} ({formatPrice(reservePrice)})
            </span>
          </div>
        )}

        {/* Bid Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Bid Type</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setBidType('pre')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                bidType === 'pre'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Pre-Bid</span>
            </button>
            <button
              onClick={() => setBidType('live')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                bidType === 'live'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Live Bid</span>
            </button>
            <button
              onClick={() => setBidType('proxy')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                bidType === 'proxy'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Proxy Bid</span>
            </button>
          </div>
        </div>

        {/* Bid Input */}
        <div className="space-y-4">
          {bidType !== 'proxy' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Bid Amount
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={decrementBid}
                  disabled={isBidDisabled || bidAmount <= currentPrice + minBidIncrement}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="h-4 w-4" />
                </button>
                
                <div className="flex-1 relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => handleBidAmountChange(Number(e.target.value))}
                    disabled={isBidDisabled}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    min={currentPrice + minBidIncrement}
                    step={minBidIncrement}
                  />
                </div>
                
                <button
                  onClick={incrementBid}
                  disabled={isBidDisabled}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum bid: {formatPrice(currentPrice + minBidIncrement)}
              </p>
            </div>
          )}

          {/* Proxy Bid Configuration */}
          {bidType === 'proxy' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={proxyMaxAmount}
                    onChange={(e) => setProxyMaxAmount(Number(e.target.value))}
                    disabled={isBidDisabled}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    min={currentPrice + minBidIncrement}
                    step={minBidIncrement}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Increment Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={proxyIncrement}
                    onChange={(e) => setProxyIncrement(Number(e.target.value))}
                    disabled={isBidDisabled}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    min={minBidIncrement}
                    step={minBidIncrement}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Proxy bidding will automatically bid up to ${formatPrice(proxyMaxAmount)} in ${formatPrice(proxyIncrement)} increments
              </p>
            </div>
          )}

          {/* Place Bid Button */}
          <button
            onClick={handlePlaceBid}
            disabled={isBidDisabled}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isPlacingBid ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Placing Bid...
              </div>
            ) : (
              bidType === 'proxy' 
                ? `Place Proxy Bid - Up to ${formatPrice(proxyMaxAmount)}`
                : `Place ${bidType === 'pre' ? 'Pre-' : 'Live '}Bid - ${formatPrice(bidAmount)}`
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-sm text-gray-500 text-center">
              Please log in to place a bid
            </p>
          )}

          {!isActive && (
            <p className="text-sm text-gray-500 text-center">
              This auction is not currently active
            </p>
          )}
        </div>

        {/* Auction Status */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {isActive 
              ? 'Auction is live - Live bidding available' 
              : bidType === 'pre' 
                ? 'Pre-bidding available' 
                : 'Auction is not active'
            }
          </span>
        </div>
      </div>
    </div>
  );
};
