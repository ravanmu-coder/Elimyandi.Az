import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Play, 
  Settings, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Plus
} from 'lucide-react'
import { KPICard } from '../components/ui/KPICard'
import { Button } from '../components/common/Button'
import { apiClient } from '../services/apiClient'
import { useToast } from '../components/common/Toast'

interface DashboardStats {
  draft: number
  scheduled: number
  ready: number
  running: number
  ended: number
  cancelled: number
}

interface SchedulerDebug {
  lastRun: string
  nextRun: string
  status: string
  isRunning: boolean
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [schedulerDebug, setSchedulerDebug] = useState<SchedulerDebug | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { success, error: showError } = useToast()

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [statsData, schedulerData] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getSchedulerDebug()
      ])
      
      setStats(statsData)
      setSchedulerDebug(schedulerData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
      showError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleForceSchedulerRun = async () => {
    try {
      await apiClient.forceSchedulerRun()
      success('Scheduler run initiated successfully')
      // Refresh scheduler debug data
      const schedulerData = await apiClient.getSchedulerDebug()
      setSchedulerDebug(schedulerData)
    } catch (err) {
      console.error('Failed to force scheduler run:', err)
      showError('Failed to force scheduler run')
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-dark-bg-tertiary rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-dark-bg-tertiary rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-dark-bg-tertiary rounded-lg"></div>
          <div className="h-80 bg-dark-bg-tertiary rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-accent-error mx-auto mb-4" />
        <h3 className="text-h3 font-heading text-dark-text-primary mb-2">Error Loading Dashboard</h3>
        <p className="text-body-md text-dark-text-secondary mb-6">{error}</p>
        <Button onClick={loadDashboardData} icon={RefreshCw}>
          Try Again
        </Button>
      </div>
    )
  }

  const chartData = stats ? [
    { name: 'Draft', value: stats.draft, color: '#6B7280' },
    { name: 'Scheduled', value: stats.scheduled, color: '#F59E0B' },
    { name: 'Ready', value: stats.ready, color: '#3B82F6' },
    { name: 'Running', value: stats.running, color: '#10B981' },
    { name: 'Ended', value: stats.ended, color: '#8B5CF6' },
    { name: 'Cancelled', value: stats.cancelled, color: '#EF4444' }
  ] : []

  const barChartData = stats ? [
    { status: 'Draft', count: stats.draft },
    { status: 'Scheduled', count: stats.scheduled },
    { status: 'Ready', count: stats.ready },
    { status: 'Running', count: stats.running },
    { status: 'Ended', count: stats.ended },
    { status: 'Cancelled', count: stats.cancelled }
  ] : []

  return (
    <div className="space-y-6">
      {/* Header - Exact match to image_80738e.png */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-heading text-dark-text-primary">Dashboard</h1>
          <p className="text-body-md text-dark-text-secondary mt-1">Welcome back!</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" icon={Download}>
            Export Report
          </Button>
          <Button icon={Plus}>
            New Auction
          </Button>
        </div>
      </div>

      {/* KPI Cards - Exact match to image_80738e.png */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Draft"
          value={stats?.draft || 0}
          subtitle="In preparation"
          icon={Settings}
        />
        <KPICard
          title="Scheduled"
          value={stats?.scheduled || 0}
          subtitle="Ready to start"
          icon={Clock}
        />
        <KPICard
          title="Ready"
          value={stats?.ready || 0}
          subtitle="Ready to start"
          icon={CheckCircle}
        />
        <KPICard
          title="Running"
          value={stats?.running || 0}
          subtitle="Currently active"
          icon={Play}
        />
        <KPICard
          title="Ended"
          value={stats?.ended || 0}
          subtitle="Completed"
          icon={CheckCircle}
        />
        <KPICard
          title="Cancelled"
          value={stats?.cancelled || 0}
          subtitle="Cancelled"
          icon={XCircle}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-dark-bg-tertiary rounded-lg border border-dark-border p-6">
          <h3 className="text-h3 font-heading text-dark-text-primary mb-6">Auction Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="status" 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                  color: '#D1D5DB'
                }}
              />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-dark-bg-tertiary rounded-lg border border-dark-border p-6">
          <h3 className="text-h3 font-heading text-dark-text-primary mb-6">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                  color: '#D1D5DB'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Maintenance Widget - Exact match to image_80738f.png */}
      <div className="bg-dark-bg-tertiary rounded-lg border border-dark-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-h3 font-heading text-dark-text-primary">System Maintenance</h3>
          <Button 
            variant="secondary" 
            icon={RefreshCw}
            onClick={handleForceSchedulerRun}
            disabled={schedulerDebug?.isRunning}
          >
            Force Run Scheduler
          </Button>
        </div>
        
        {schedulerDebug && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-body-sm text-dark-text-muted">Last Run</p>
              <p className="text-body-md text-dark-text-primary">
                {new Date(schedulerDebug.lastRun).toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-body-sm text-dark-text-muted">Next Run</p>
              <p className="text-body-md text-dark-text-primary">
                {new Date(schedulerDebug.nextRun).toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-body-sm text-dark-text-muted">Status</p>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  schedulerDebug.isRunning ? 'bg-accent-success animate-pulse' : 'bg-dark-text-muted'
                }`} />
                <p className="text-body-md text-dark-text-primary">
                  {schedulerDebug.isRunning ? 'Running' : 'Idle'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}