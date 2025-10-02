import { useState } from 'react'
import { X, AlertTriangle, Trash2, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface DeleteAuctionModalProps {
  isOpen: boolean
  onClose: () => void
  auction: {
    id: string
    name: string
    status?: string
    vehicleCount?: number
  } | null
  onSuccess: () => void
}

interface DeletionStep {
  id: string
  type: 'auctioncar' | 'auction'
  status: 'pending' | 'success' | 'error' | 'skipped'
  error?: string
  name?: string
}

export function DeleteAuctionModal({ isOpen, onClose, auction, onSuccess }: DeleteAuctionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deletionSteps, setDeletionSteps] = useState<DeletionStep[]>([])
  const [currentStep, setCurrentStep] = useState<string>('')
  const [showRetry, setShowRetry] = useState(false)
  const [failedSteps, setFailedSteps] = useState<DeletionStep[]>([])
  const [operationTimeout, setOperationTimeout] = useState<NodeJS.Timeout | null>(null)

  // Clear all states
  const resetStates = () => {
    setError(null)
    setConfirmText('')
    setDeletionSteps([])
    setCurrentStep('')
    setShowRetry(false)
    setFailedSteps([])
    if (operationTimeout) {
      clearTimeout(operationTimeout)
      setOperationTimeout(null)
    }
  }

  // Update step status
  const updateStepStatus = (stepId: string, status: DeletionStep['status'], error?: string) => {
    setDeletionSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, error } : step
    ))
  }

  // Add step to deletion list
  const addStep = (step: DeletionStep) => {
    setDeletionSteps(prev => [...prev, step])
  }

  // Handle timeout
  const handleTimeout = () => {
    setError('Operation timed out — partial deletes may have occurred. Check auction details.')
    setLoading(false)
    setShowRetry(true)
  }

  // Main deletion handler
  const handleDelete = async () => {
    if (!auction) return
    
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setLoading(true)
    setError(null)
    setDeletionSteps([])
    setFailedSteps([])
    setShowRetry(false)

    // Set timeout (60 seconds)
    const timeout = setTimeout(handleTimeout, 60000)
    setOperationTimeout(timeout)

    try {
      console.log(`Starting comprehensive deletion process for auction ${auction.id}`)
      
      // Step 1: Get all auction cars
      setCurrentStep('Fetching vehicles to delete...')
      console.log('Step 1: Fetching auction cars...')
      
      let auctionCars: any[] = []
      try {
        const response = await apiClient.getAuctionCarsByAuction(auction.id)
        console.log('Raw auction cars response:', response)
        
        auctionCars = Array.isArray(response) ? response : []
        console.log(`Found ${auctionCars.length} auction cars to delete`)
        
        // Add auction cars to deletion steps
        auctionCars.forEach((car, index) => {
          addStep({
            id: car.id,
            type: 'auctioncar',
            status: 'pending',
            name: `Vehicle ${index + 1} (${car.lotNumber || car.id})`
          })
        })
        
        // Add auction deletion step
        addStep({
          id: auction.id,
          type: 'auction',
          status: 'pending',
          name: `Auction: ${auction.name}`
        })
        
      } catch (fetchError: any) {
        console.error('Error fetching auction cars:', fetchError)
        // If we can't fetch auction cars, still try to delete the auction
        addStep({
          id: auction.id,
          type: 'auction',
          status: 'pending',
          name: `Auction: ${auction.name}`
        })
      }

      // Step 2: Delete auction cars sequentially (safer approach)
      if (auctionCars.length > 0) {
        setCurrentStep(`Deleting ${auctionCars.length} vehicles...`)
        console.log('Step 2: Deleting auction cars sequentially...')
        
        for (let i = 0; i < auctionCars.length; i++) {
          const auctionCar = auctionCars[i]
          setCurrentStep(`Deleting vehicle ${i + 1}/${auctionCars.length}...`)
          
          try {
            console.log(`Deleting auction car ${auctionCar.id}...`)
            await apiClient.deleteAuctionCar(auctionCar.id)
            
            updateStepStatus(auctionCar.id, 'success')
            console.log(`Successfully deleted auction car ${auctionCar.id}`)
            
            // Small delay to prevent overwhelming server
            await new Promise(resolve => setTimeout(resolve, 200))
            
          } catch (deleteError: any) {
            console.error(`Failed to delete auction car ${auctionCar.id}:`, deleteError)
            
            let errorMessage = 'Unknown error'
            if (deleteError.status === 404) {
              errorMessage = 'Already deleted'
              updateStepStatus(auctionCar.id, 'skipped', errorMessage)
            } else if (deleteError.status >= 400 && deleteError.status < 500) {
              errorMessage = deleteError.message || `Client error (${deleteError.status})`
              updateStepStatus(auctionCar.id, 'error', errorMessage)
              setFailedSteps(prev => [...prev, {
                id: auctionCar.id,
                type: 'auctioncar',
                status: 'error',
                error: errorMessage,
                name: `Vehicle ${i + 1}`
              }])
            } else if (deleteError.status >= 500) {
              errorMessage = 'Server error - try again later'
              updateStepStatus(auctionCar.id, 'error', errorMessage)
              setFailedSteps(prev => [...prev, {
                id: auctionCar.id,
                type: 'auctioncar',
                status: 'error',
                error: errorMessage,
                name: `Vehicle ${i + 1}`
              }])
            } else {
              updateStepStatus(auctionCar.id, 'error', errorMessage)
              setFailedSteps(prev => [...prev, {
                id: auctionCar.id,
                type: 'auctioncar',
                status: 'error',
                error: errorMessage,
                name: `Vehicle ${i + 1}`
              }])
            }
            
            // Stop on first error (serial approach)
            throw new Error(`Failed to delete vehicle: ${errorMessage}`)
          }
        }
        
        console.log('All auction cars processed')
        setCurrentStep('Vehicles deleted successfully')
      } else {
        console.log('No auction cars found to delete')
        setCurrentStep('No vehicles to delete')
      }

      // Step 3: Delete the auction
      setCurrentStep('Deleting auction...')
      console.log('Step 3: Deleting auction...')
      
      try {
        await apiClient.deleteAuction(auction.id)
        updateStepStatus(auction.id, 'success')
        console.log('Auction deleted successfully')
        
        // Clear timeout
        if (operationTimeout) {
          clearTimeout(operationTimeout)
          setOperationTimeout(null)
        }
        
        setCurrentStep('Deletion completed successfully')
        
        // Success - show success message and close
        setTimeout(() => {
          onSuccess()
          onClose()
          resetStates()
        }, 1500)
        
      } catch (auctionError: any) {
        console.error('Failed to delete auction:', auctionError)
        
        let errorMessage = 'Unknown error'
        if (auctionError.status === 409) {
          errorMessage = 'Auction is live - stop it first'
        } else if (auctionError.status === 400) {
          errorMessage = auctionError.message || 'Invalid request'
        } else if (auctionError.status >= 500) {
          errorMessage = 'Server error - try again later'
        } else {
          errorMessage = auctionError.message || 'Failed to delete auction'
        }
        
        updateStepStatus(auction.id, 'error', errorMessage)
        setFailedSteps(prev => [...prev, {
          id: auction.id,
          type: 'auction',
          status: 'error',
          error: errorMessage,
          name: `Auction: ${auction.name}`
        }])
        
        throw new Error(`Failed to delete auction: ${errorMessage}`)
      }
      
    } catch (err: any) {
      console.error('Error in deletion process:', err)
      setError(err.message || 'Failed to delete auction and associated vehicles')
      setShowRetry(true)
    } finally {
      setLoading(false)
    }
  }

  // Retry failed deletions
  const handleRetry = async () => {
    if (failedSteps.length === 0) return
    
    setLoading(true)
    setError(null)
    setShowRetry(false)
    
    try {
      for (const step of failedSteps) {
        if (step.type === 'auctioncar') {
          try {
            await apiClient.deleteAuctionCar(step.id)
            updateStepStatus(step.id, 'success')
          } catch (error) {
            console.error(`Retry failed for auction car ${step.id}:`, error)
          }
        } else if (step.type === 'auction') {
          try {
            await apiClient.deleteAuction(step.id)
            updateStepStatus(step.id, 'success')
            
            // Success - close modal
            setTimeout(() => {
              onSuccess()
              onClose()
              resetStates()
            }, 1500)
            return
          } catch (error) {
            console.error(`Retry failed for auction ${step.id}:`, error)
          }
        }
      }
      
      setError('Some items could not be deleted. Please check manually.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetStates()
    onClose()
  }

  if (!isOpen || !auction) return null

  const successCount = deletionSteps.filter(step => step.status === 'success').length
  const errorCount = deletionSteps.filter(step => step.status === 'error').length
  const totalCount = deletionSteps.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Delete Auction</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Section */}
          {loading && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-gray-900">{currentStep}</span>
              </div>
              
              {/* Progress Bar */}
              {totalCount > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(successCount / totalCount) * 100}%` }}
                  ></div>
                </div>
              )}
              
              {/* Progress Text */}
              {totalCount > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Progress: {successCount}/{totalCount}</span>
                  {errorCount > 0 && <span className="text-red-600">{errorCount} failed</span>}
                </div>
              )}
            </div>
          )}

          {/* Steps List */}
          {deletionSteps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Deletion Progress</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {deletionSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    {step.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                    {step.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {step.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                    {step.status === 'skipped' && <XCircle className="w-4 h-4 text-yellow-600" />}
                    
                    <div className="flex-1">
                      <span className="text-sm text-gray-900">{step.name}</span>
                      {step.error && (
                        <p className="text-xs text-red-600">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retry Section */}
          {showRetry && failedSteps.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Some deletions failed</h3>
              <p className="text-sm text-yellow-700 mb-3">
                {failedSteps.length} item(s) could not be deleted. Would you like to retry?
              </p>
              <button
                onClick={handleRetry}
                disabled={loading}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Failed Deletions
              </button>
            </div>
          )}

          {/* Warning Section */}
          {!loading && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Warning</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Deleting this auction will permanently remove all associated data including:
                    </p>
                    <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                      <li>Auction details and settings</li>
                      <li><strong>All vehicles assigned to this auction (auction cars will be deleted)</strong></li>
                      <li>Bid history and statistics</li>
                      <li>Timer and status information</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Auction Details:</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Name:</span> {auction.name}</p>
                    <p><span className="font-medium">Status:</span> {auction.status}</p>
                    {auction.vehicleCount !== undefined && (
                      <p><span className="font-medium">Vehicles:</span> {auction.vehicleCount}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To confirm deletion of auction and all associated vehicles, type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span>:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Type DELETE to confirm"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== 'DELETE'}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Auction
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}