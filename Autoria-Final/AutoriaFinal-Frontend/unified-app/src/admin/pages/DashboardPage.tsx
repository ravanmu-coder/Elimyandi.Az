import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Users, 
  Car, 
  Gavel, 
  Calendar,
  Activity,
  Plus,
  FileText,
  BarChart3
} from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface DashboardStats {
  totalRevenue: number
  activeAuctions: number
  totalVehicles: number
  registeredUsers: number
}

interface ActivityItem {
  id: string
  type: string
  message: string
  timestamp: string
  icon: string
}

interface UpcomingAuction {
  id: string
  name: string
  startTime: string
  vehicleCount: number
  location: string
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [upcomingAuctions, setUpcomingAuctions] = useState<UpcomingAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsData, activitiesData, auctionsData] = await Promise.all([
        apiClient.getStatsOverview(),
        apiClient.getRecentActivity(),
        apiClient.getUpcomingAuctions()
      ])

      setStats(statsData)
      setActivities(activitiesData)
      setUpcomingAuctions(auctionsData)
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-red-600">Error: {error}</p>
          </div>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your auctions.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            New Auction
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats?.totalRevenue?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-green-600">Real-time data</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Auctions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.activeAuctions || 0}
                </p>
                <p className="text-sm text-green-600">Currently running</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Gavel className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalVehicles?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-green-600">In inventory</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Registered Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.registeredUsers?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-green-600">Active users</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View All
              </button>
            </div>
            
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {activity.icon === 'Gavel' ? (
                        <Gavel className="w-5 h-5 text-blue-600" />
                      ) : activity.icon === 'TrendingUp' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <Activity className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400">Activity will appear here as users interact with the platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Auctions */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Auctions</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View All
              </button>
            </div>
            
            {upcomingAuctions.length > 0 ? (
              <div className="space-y-4">
                {upcomingAuctions.map((auction) => (
                  <div key={auction.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{auction.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(auction.startTime).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{auction.vehicleCount} vehicles</p>
                    <p className="text-xs text-gray-500">{auction.location}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming auctions</p>
                <p className="text-sm text-gray-400">Scheduled auctions will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="h-20 flex flex-col items-center justify-center space-y-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <Car className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Add Vehicle</span>
          </button>
          <button className="h-20 flex flex-col items-center justify-center space-y-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <Gavel className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Create Auction</span>
          </button>
          <button className="h-20 flex flex-col items-center justify-center space-y-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <Users className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Manage Users</span>
          </button>
          <button className="h-20 flex flex-col items-center justify-center space-y-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <BarChart3 className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  )
}
