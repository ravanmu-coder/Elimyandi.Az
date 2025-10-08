import { useState } from 'react'
import { Settings, Bug, RefreshCw, Download } from 'lucide-react'
import { Button } from '../components/common/Button'
import { AuctionList } from '../components/AuctionList'
import { AuctionForm } from '../components/AuctionForm'
import { AuctionDetailModal } from '../components/AuctionDetailModal'
import { ConfigModal } from '../components/ConfigModal'
import { DebugPanel } from '../components/DebugPanel'
import { useToast } from '../components/common/Toast'

export function AuctionsListPage() {
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailAuctionId, setDetailAuctionId] = useState<string | null>(null)
  const { success, error, info } = useToast()

  const handleAuctionSelect = (auctionId: string) => {
    if (auctionId === '') {
      // Create new auction mode
      setSelectedAuctionId(null)
    } else {
      setSelectedAuctionId(auctionId)
    }
  }

  const handleViewDetails = (auctionId: string) => {
    setDetailAuctionId(auctionId)
    setShowDetailModal(true)
  }

  const handleAuctionSaved = () => {
    // Refresh the auction list
    // This will be handled by the AuctionList component
  }

  const handleAuctionDeleted = () => {
    setSelectedAuctionId(null)
    // Refresh the auction list
    // This will be handled by the AuctionList component
  }

  const handleRefresh = () => {
    // This will be handled by the AuctionList component
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    info('Export functionality coming soon')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-bg-secondary">
        <div className="flex items-center space-x-4">
          <h1 className="text-h1 font-heading text-dark-text-primary">Auctions</h1>
          <p className="text-body-md text-dark-text-secondary">Manage your auction lifecycle</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            icon={Settings} 
            onClick={() => setShowConfigModal(true)}
          >
            Config
          </Button>
          <Button 
            variant="secondary" 
            icon={Bug} 
            onClick={() => setShowDebugPanel(true)}
          >
            Debug
          </Button>
          <Button 
            variant="secondary" 
            icon={RefreshCw} 
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button 
            variant="secondary" 
            icon={Download} 
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 grid grid-cols-10 gap-0 min-h-0">
        {/* Left Panel - Auction List (70%) */}
        <div className="col-span-7 bg-dark-bg-primary border-r border-dark-border">
          <AuctionList
            selectedAuctionId={selectedAuctionId}
            onAuctionSelect={handleAuctionSelect}
            onViewDetails={handleViewDetails}
            onRefresh={handleRefresh}
          />
      </div>

        {/* Right Panel - Auction Form (30%) */}
        <div className="col-span-3 bg-dark-bg-secondary">
          <AuctionForm
            selectedAuctionId={selectedAuctionId}
            onAuctionSaved={handleAuctionSaved}
            onAuctionDeleted={handleAuctionDeleted}
          />
        </div>
      </div>

      {/* Modals */}
      {showConfigModal && (
        <ConfigModal
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {showDebugPanel && (
        <DebugPanel
          onClose={() => setShowDebugPanel(false)}
        />
      )}

      {showDetailModal && detailAuctionId && (
      <AuctionDetailModal
          auctionId={detailAuctionId}
        onClose={() => {
          setShowDetailModal(false)
            setDetailAuctionId(null)
          }}
        />
      )}
    </div>
  )
}