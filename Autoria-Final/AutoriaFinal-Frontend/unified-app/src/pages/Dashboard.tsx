import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { apiClient } from '../lib/api';
import { AuctionGetDto } from '../types/api';
import AuctionCard from '../components/AuctionCard';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Car,
  Users,
  DollarSign,
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [liveAuctions, setLiveAuctions] = useState<AuctionGetDto[]>([]);
  const [upcomingAuctions, setUpcomingAuctions] = useState<AuctionGetDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats] = useState({
    totalAuctions: 12,
    activeBids: 8,
    watchedItems: 15,
    totalSpent: 25000
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      const [live, upcoming] = await Promise.all([
        apiClient.getLiveAuctions(),
        apiClient.getReadyToStartAuctions()
      ]);
      
      console.log('Live auctions:', live);
      console.log('Upcoming auctions:', upcoming);
      
      setLiveAuctions(live || []);
      setUpcomingAuctions(upcoming || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty arrays as fallback
      setLiveAuctions([]);
      setUpcomingAuctions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded"></div>
                      <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded"></div>
                      <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening in your auctions today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats.totalAuctions}
            </div>
            <div className="text-sm text-gray-600">Auctions Participated</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Active</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats.activeBids}
            </div>
            <div className="text-sm text-gray-600">Active Bids</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Car className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">Watching</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats.watchedItems}
            </div>
            <div className="text-sm text-gray-600">Watched Items</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Lifetime</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(stats.totalSpent)}
            </div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live Auctions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                Live Auctions
              </h2>
              <Link 
                to="/auctions?filter=live" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {liveAuctions.length > 0 ? (
              <div className="space-y-4">
                {liveAuctions.slice(0, 3).map(auction => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <img src="/logo-icon.svg" alt="Əlimyandı.az logo" className="h-12 w-12 mx-auto mb-4 opacity-50" aria-label="Əlimyandı.az" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Live Auctions</h3>
                <p className="text-gray-600 mb-4">There are no live auctions at the moment.</p>
                <Link 
                  to="/auctions" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse All Auctions
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Auctions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-3 text-blue-600" />
                Upcoming Auctions
              </h2>
              <Link 
                to="/auctions?filter=upcoming" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {upcomingAuctions.length > 0 ? (
              <div className="space-y-4">
                {upcomingAuctions.slice(0, 3).map(auction => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Auctions</h3>
                <p className="text-gray-600 mb-4">All scheduled auctions are currently in progress.</p>
                <Link 
                  to="/auctions" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse All Auctions
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">Ready to start bidding?</h2>
            <p className="text-blue-100 mb-6 text-lg">
              Discover amazing cars and place your bids in live auctions. Don't miss out on great deals!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/auctions"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <img src="/logo-icon.svg" alt="Əlimyandı.az logo" className="h-5 w-5 mr-2" aria-label="Əlimyandı.az" />
                Browse Auctions
              </Link>
              <Link
                to="/my-bids"
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors border border-blue-400"
              >
                <Users className="h-5 w-5 mr-2" />
                My Bids
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}