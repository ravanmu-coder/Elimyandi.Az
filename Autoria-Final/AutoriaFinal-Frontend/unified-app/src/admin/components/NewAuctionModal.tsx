import { useState, useEffect } from 'react'
import { X, Calendar, MapPin, DollarSign, Clock, Settings, Plus } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface NewAuctionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (auction: any) => void
  onAuctionCreated?: (auction: any) => void
}

interface Location {
  id: string
  name: string
  city: string
  address: string
}

export function NewAuctionModal({ isOpen, onClose, onSuccess, onAuctionCreated }: NewAuctionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTimeUtc: '',
    endTimeUtc: '',
    locationId: '',
    timerSeconds: 10,
    minBidIncrement: 100,
    maxCarDurationMinutes: 30,
    currency: 'USD',
    timezone: 'UTC',
    isPublic: true,
    isPrivate: false,
    requireRegistration: false,
    autoAdvance: false,
    status: 'Draft' // Default draft status
  })
  
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showAddVehicle, setShowAddVehicle] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadLocations()
      // Set default times
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const endTime = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
      
      setFormData(prev => ({
        ...prev,
        startTimeUtc: tomorrow.toISOString().slice(0, 16),
        endTimeUtc: endTime.toISOString().slice(0, 16)
      }))
    }
  }, [isOpen])

  const loadLocations = async () => {
    try {
      const data = await apiClient.getLocations()
      setLocations(data || [])
    } catch (err) {
      console.error('Error loading locations:', err)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent, openAddVehicle = false) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      setError('Auction adı mütləqdir')
      return
    }
    
    if (formData.name.trim().length < 3 || formData.name.trim().length > 200) {
      setError('Auction adı 3-200 simvol arasında olmalıdır')
      return
    }
    
    if (!formData.locationId) {
      setError('Location mütləqdir')
      return
    }
    
    if (!formData.startTimeUtc) {
      setError('Başlama vaxtı mütləqdir')
      return
    }
    
    if (!formData.endTimeUtc) {
      setError('Bitmə vaxtı mütləqdir')
      return
    }
    
    if (new Date(formData.startTimeUtc) >= new Date(formData.endTimeUtc)) {
      setError('Bitmə vaxtı başlama vaxtından sonra olmalıdır')
      return
    }
    
    if (formData.timerSeconds < 1 || formData.timerSeconds > 600) {
      setError('Timer 1-600 saniyə arasında olmalıdır')
      return
    }
    
    if (formData.minBidIncrement < 1 || formData.minBidIncrement > 10000) {
      setError('Minimum bid artımı 1-10000 arasında olmalıdır')
      return
    }
    
    if (formData.maxCarDurationMinutes < 5 || formData.maxCarDurationMinutes > 120) {
      setError('Maksimum maşın müddəti 5-120 dəqiqə arasında olmalıdır')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const auctionData = {
        ...formData,
        startTimeUtc: new Date(formData.startTimeUtc).toISOString(),
        endTimeUtc: new Date(formData.endTimeUtc).toISOString()
      }

      const newAuction = await apiClient.createAuction(auctionData)
      
      if (openAddVehicle && onAuctionCreated) {
        onAuctionCreated(newAuction)
      } else {
        onSuccess(newAuction)
        onClose()
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        startTimeUtc: '',
        endTimeUtc: '',
        locationId: '',
        timerSeconds: 10,
        minBidIncrement: 100,
        maxCarDurationMinutes: 30,
        currency: 'USD',
        timezone: 'UTC',
        isPublic: true,
        isPrivate: false,
        requireRegistration: false,
        autoAdvance: false,
        status: 'Draft'
      })
    } catch (err: any) {
      console.error('Error creating auction:', err)
      setError(err.message || 'Failed to create auction')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Auction</h2>
              <p className="text-sm text-gray-600">Set up a new auction event</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auction Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter auction name"
                  minLength={3}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">3-200 characters required</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="AZN">AZN</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter auction description"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 2000 characters</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time (UTC) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTimeUtc}
                  onChange={(e) => handleInputChange('startTimeUtc', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Local time will be converted to UTC</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time (UTC) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTimeUtc}
                  onChange={(e) => handleInputChange('endTimeUtc', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must be after start time</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="Asia/Baku">Asia/Baku</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timer Seconds *
                </label>
                <input
                  type="number"
                  value={formData.timerSeconds}
                  onChange={(e) => handleInputChange('timerSeconds', parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="600"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Auction car countdown (seconds)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Bid Increment *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.minBidIncrement}
                    onChange={(e) => handleInputChange('minBidIncrement', parseInt(e.target.value) || 100)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="10000"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum bid increment applied during live bidding</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Car Duration (Minutes) *
                </label>
                <input
                  type="number"
                  value={formData.maxCarDurationMinutes}
                  onChange={(e) => handleInputChange('maxCarDurationMinutes', parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="120"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Maximum allowed time per car in minutes</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auction Location *
              </label>
              <select
                value={formData.locationId}
                onChange={(e) => handleInputChange('locationId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} - {location.city}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Location is required</p>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Auction Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => {
                      handleInputChange('isPublic', e.target.checked)
                      handleInputChange('isPrivate', !e.target.checked)
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Public Auction</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPrivate}
                    onChange={(e) => {
                      handleInputChange('isPrivate', e.target.checked)
                      handleInputChange('isPublic', !e.target.checked)
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Private Auction</span>
                </label>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.requireRegistration}
                    onChange={(e) => handleInputChange('requireRegistration', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require Registration</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoAdvance}
                    onChange={(e) => handleInputChange('autoAdvance', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto Advance</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  Save as Draft
                </>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create & Add Vehicles
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
